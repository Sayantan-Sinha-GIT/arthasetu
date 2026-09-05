'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LANGUAGE_BCP47_MAP } from './useSpeechSynthesis';

// Minimal Web Speech API surface used here — the DOM lib doesn't ship types
// for this API, and browser vendors haven't converged on a shared shape, so
// we declare just what we touch rather than pulling in a third-party types
// package for a handful of fields.
interface ISpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: ISpeechRecognitionResult };
}
interface ISpeechRecognitionErrorEvent {
  error: string;
}
interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionConstructor = new () => ISpeechRecognition;

interface IWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

/**
 * How long the user may stay silent before we treat the utterance as finished.
 *
 * This is OUR endpointer, not the browser's. Chrome's built-in one ends the
 * session at the first pause it hears, which for a hesitant speaker means a
 * half-spoken sentence — the defect this whole module was rewritten to fix.
 * We keep the stream open instead and decide for ourselves when they're done.
 *
 * Indic locales get a longer window than English. Chrome's acoustic models for
 * them are weaker, so partial results arrive later and in burstier clumps; a
 * window tight enough for English cuts them off. The audience matters too —
 * this is aimed at rural micro-entrepreneurs who are often composing a thought
 * aloud, not dictating a prepared line. Erring long costs a beat of latency;
 * erring short loses their sentence, and "Done speaking" is always there for
 * anyone who wants to skip the wait.
 */
const SILENCE_COMMIT_MS_DEFAULT = 5000;
const SILENCE_COMMIT_MS_ENGLISH = 3500;

/**
 * Ceiling on one dictation, so a mic left open in a pocket doesn't stream
 * indefinitely. Generous: a slow speaker describing a business easily needs a
 * minute.
 */
const MAX_SESSION_MS = 120000;

/**
 * If we've heard nothing whatsoever for this long, stop and say so. Only
 * applies before the first word — once they've said something, the silence
 * window above takes over.
 */
const INITIAL_SILENCE_MS = 15000;

/**
 * Chrome restarts are cheap but not free, and a locale the service refuses
 * would otherwise spin. Cap consecutive restarts that produced no speech.
 */
const MAX_BARREN_RESTARTS = 8;

/**
 * Recognition locales to fall back to when the browser rejects the first
 * choice with `language-not-supported`.
 *
 * Chrome's recognition language list is shorter than its interface language
 * list, so several of the twenty-three languages we render have no recognizer
 * of their own. A sibling that shares the script is a poor transcriber but a
 * usable one; silently listening in English — which is what an unhandled
 * rejection leaves you with — is not, because it returns confident nonsense.
 */
const STT_FALLBACKS: Record<string, string[]> = {
  as: ['bn-IN'],
  or: ['bn-IN', 'hi-IN'],
  sa: ['hi-IN'],
  mai: ['hi-IN'],
  doi: ['hi-IN'],
  kok: ['mr-IN', 'hi-IN'],
  ks: ['ur-IN', 'hi-IN'],
  sd: ['ur-IN', 'hi-IN'],
  sat: ['hi-IN'],
  mni: ['bn-IN', 'hi-IN'],
  brx: ['as-IN', 'bn-IN', 'hi-IN'],
  ne: ['hi-IN'],
  ur: ['hi-IN'],
};

export interface SpeechRecognitionErrorMessages {
  permissionDenied?: string;
  languageNotSupported?: string;
  noSpeech?: string;
  notSupported?: string;
  startFailed?: string;
}

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  defaultLanguage?: string;
  errorMessages?: SpeechRecognitionErrorMessages;
}

/** Joins accumulated speech without doubling the spaces around segments. */
function joinSegments(a: string, b: string): string {
  const left = a.trim();
  const right = b.trim();
  if (!left) return right;
  if (!right) return left;
  return `${left} ${right}`;
}

export function useSpeechRecognition({
  onResult,
  onError,
  defaultLanguage = 'hi-IN',
  errorMessages,
}: UseSpeechRecognitionOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const errorMessagesRef = useRef(errorMessages);

  useEffect(() => {
    errorMessagesRef.current = errorMessages;
  }, [errorMessages]);

  // A dictation is a state machine spanning several browser-driven restarts,
  // so its state lives in refs: the event handlers below are installed once per
  // browser session and would otherwise close over stale values.
  const intentRef = useRef<'idle' | 'listening' | 'stopping' | 'aborting'>('idle');
  const finalRef = useRef('');
  const interimRef = useRef('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionDeadlineRef = useRef(0);
  const barrenRestartsRef = useRef(0);
  const heardSpeechRef = useRef(false);
  const localeQueueRef = useRef<string[]>([]);
  const activeLocaleRef = useRef('');
  const consumedFinalsRef = useRef(0);
  // `beginSession` restarts itself from `onend`; going through a ref keeps that
  // self-reference out of its own dependency list.
  const beginSessionRef = useRef<() => void>(() => {});

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  });

  // Check browser support on client mount. Deferred to an effect (rather than
  // a lazy useState initializer) so server and first client render both start
  // `false`, avoiding a hydration mismatch on whatever UI this flag gates.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as IWindow;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsSupported(true);
      }
    }
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  /**
   * Ends the dictation and hands the accumulated text to the caller.
   *
   * Every exit route funnels through here — the silence timer, the "Done
   * speaking" button, the session ceiling — so the buffer is delivered exactly
   * once and the machine always lands back on `idle`.
   */
  const finish = useCallback((deliver: boolean) => {
    clearSilenceTimer();
    intentRef.current = 'idle';

    const collected = joinSegments(finalRef.current, interimRef.current);
    finalRef.current = '';
    interimRef.current = '';

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      // Detach first: a stop()/abort() fires `onend`, and a restart from a
      // session we've already retired would resurrect the dictation.
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        /* already dead; nothing to unwind */
      }
    }

    setIsListening(false);
    setInterimTranscript('');

    if (deliver && collected) {
      setTranscript(collected);
      onResultRef.current?.(collected);
    }
  }, [clearSilenceTimer]);

  /**
   * (Re)arms our endpointer. Called on every scrap of audio that comes back,
   * so the countdown only runs during genuine silence.
   */
  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    const isEnglish = activeLocaleRef.current.toLowerCase().startsWith('en');
    const heard = heardSpeechRef.current || finalRef.current || interimRef.current;
    const windowMs = heard
      ? (isEnglish ? SILENCE_COMMIT_MS_ENGLISH : SILENCE_COMMIT_MS_DEFAULT)
      : INITIAL_SILENCE_MS;

    silenceTimerRef.current = setTimeout(() => {
      if (intentRef.current !== 'listening') return;
      if (!heardSpeechRef.current && !finalRef.current.trim()) {
        // Nothing was ever said. Report it rather than delivering an empty
        // message, but only here — a mid-dictation `no-speech` is normal and is
        // swallowed in onerror.
        finish(false);
        const msg = 'No speech detected. Please tap the mic and speak clearly.';
        setError(msg);
        onErrorRef.current?.(msg);
        return;
      }
      finish(true);
    }, windowMs);
  }, [clearSilenceTimer, finish]);

  const beginSession = useCallback(() => {
    if (typeof window === 'undefined') return;
    const win = window as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;
    consumedFinalsRef.current = 0;

    // The heart of the fix. Chrome's own endpointer closes the session at the
    // first pause; keeping it continuous hands that decision to `armSilenceTimer`
    // instead, which is patient enough for someone thinking aloud.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = activeLocaleRef.current;

    recognition.onstart = () => {
      setIsListening(true);
      armSilenceTimer();
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      if (intentRef.current === 'aborting') return;

      let freshFinal = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          // `results` accumulates for the whole session and Chrome sometimes
          // re-delivers a result that was already final, so track how far we've
          // consumed rather than trusting resultIndex alone.
          if (i >= consumedFinalsRef.current) {
            freshFinal = joinSegments(freshFinal, res[0].transcript);
            consumedFinalsRef.current = i + 1;
          }
        } else {
          currentInterim = joinSegments(currentInterim, res[0].transcript);
        }
      }

      if (freshFinal) {
        finalRef.current = joinSegments(finalRef.current, freshFinal);
      }
      interimRef.current = currentInterim;

      if (freshFinal || currentInterim) {
        heardSpeechRef.current = true;
        barrenRestartsRef.current = 0;
      }

      setInterimTranscript(joinSegments(finalRef.current, currentInterim));
      armSilenceTimer();
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsPermissionDenied(true);
        const msg = errorMessagesRef.current?.permissionDenied || 'Microphone access was denied. Please allow microphone permissions in your browser.';
        finish(false);
        setError(msg);
        onErrorRef.current?.(msg);
        return;
      }

      if (event.error === 'language-not-supported') {
        // Chrome recognises fewer languages than we render. Drop to the next
        // script-compatible locale rather than letting it default to English,
        // which transcribes confident nonsense.
        const next = localeQueueRef.current.shift();
        if (next) {
          activeLocaleRef.current = next;
          try { recognition.abort(); } catch { /* handled by onend */ }
          return;
        }
        finish(false);
        const msg = errorMessagesRef.current?.languageNotSupported || 'Voice input is not available for this language in your browser.';
        setError(msg);
        onErrorRef.current?.(msg);
        return;
      }

      // `no-speech`, `aborted`, `network` and friends are routine mid-dictation
      // events, not failures. Previously `no-speech` tore the session down and
      // raised a toast, which is exactly what a pausing speaker triggers. Let
      // `onend` restart instead; the silence timer still bounds the wait.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech recognition error event:', event.error);
      }
    };

    recognition.onend = () => {
      if (intentRef.current !== 'listening') return;

      if (Date.now() > sessionDeadlineRef.current) {
        finish(true);
        return;
      }

      if (!heardSpeechRef.current && ++barrenRestartsRef.current > MAX_BARREN_RESTARTS) {
        finish(false);
        const msg = errorMessagesRef.current?.noSpeech || 'No speech detected. Please tap the mic and speak clearly.';
        setError(msg);
        onErrorRef.current?.(msg);
        return;
      }

      // Chrome ends sessions on its own — silence, a network blip, its internal
      // ~60s cap. Reopen and carry the buffer across; to the user it stays one
      // continuous dictation.
      try {
        beginSessionRef.current();
      } catch {
        finish(true);
      }
    };

    recognition.start();
  }, [armSilenceTimer, finish]);

  useEffect(() => {
    beginSessionRef.current = beginSession;
  }, [beginSession]);

  const startListening = useCallback((lang?: string) => {
    if (typeof window === 'undefined') return;

    const win = window as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      const msg = errorMessagesRef.current?.notSupported || 'Speech recognition is not supported in this browser.';
      setError(msg);
      onErrorRef.current?.(msg);
      return;
    }

    // Retire anything still running before opening a fresh dictation.
    if (intentRef.current !== 'idle') finish(false);

    const rawLang = (typeof lang === 'string' && lang.trim().length > 0)
      ? lang.trim()
      : (defaultLanguage || 'hi-IN');
    const shortCode = rawLang.split('-')[0];
    const primary = LANGUAGE_BCP47_MAP[shortCode] || rawLang;

    activeLocaleRef.current = primary;
    localeQueueRef.current = (STT_FALLBACKS[shortCode] || []).filter((l) => l !== primary);

    setError(null);
    setIsPermissionDenied(false);
    setInterimTranscript('');
    finalRef.current = '';
    interimRef.current = '';
    heardSpeechRef.current = false;
    barrenRestartsRef.current = 0;
    sessionDeadlineRef.current = Date.now() + MAX_SESSION_MS;
    intentRef.current = 'listening';

    try {
      beginSession();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      finish(false);
      const msg = errorMessagesRef.current?.startFailed || 'Could not start speech recognition. Please check your microphone settings.';
      setError(msg);
      onErrorRef.current?.(msg);
    }
  }, [defaultLanguage, beginSession, finish]);

  /** "Done speaking" — deliver whatever has been heard so far. */
  const stopListening = useCallback(() => {
    if (intentRef.current !== 'listening') return;
    intentRef.current = 'stopping';
    finish(true);
  }, [finish]);

  /** "Cancel" — discard it. */
  const abortListening = useCallback(() => {
    if (intentRef.current === 'idle') return;
    intentRef.current = 'aborting';
    finish(false);
  }, [finish]);

  // Leaving the page mid-dictation should release the microphone.
  useEffect(() => () => {
    intentRef.current = 'aborting';
    clearSilenceTimer();
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try { recognition.abort(); } catch { /* nothing to unwind */ }
    }
  }, [clearSilenceTimer]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    isPermissionDenied,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
  };
}
