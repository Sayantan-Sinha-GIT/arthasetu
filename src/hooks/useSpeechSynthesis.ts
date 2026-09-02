'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * BCP-47 Locale Map for all 22 Official Scheduled Indian Languages + English
 *
 * Languages with no speech engine of their own borrow the closest one that
 * shares their script, which is the best the Web Speech API can do for them.
 */
export const LANGUAGE_BCP47_MAP: Record<string, string> = {
  hi: 'hi-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  ur: 'ur-IN',
  or: 'or-IN',
  as: 'as-IN',
  ne: 'ne-NP',
  sa: 'sa-IN',
  mai: 'hi-IN',
  doi: 'hi-IN',
  kok: 'mr-IN',
  ks: 'ur-IN',
  sd: 'sd-IN',
  sat: 'bn-IN',
  mni: 'bn-IN',
  brx: 'as-IN',
  en: 'en-IN',
};

/**
 * Second-choice engines, tried when the language's own voice is missing but a
 * closely related one that renders the same script is installed. Reading
 * Bengali with an Assamese voice is imperfect; reading it with an English
 * voice produces nothing at all, which is what used to happen.
 */
const SCRIPT_SIBLINGS: Record<string, string[]> = {
  bn: ['as'],
  as: ['bn'],
  hi: ['mr', 'ne', 'sa'],
  mr: ['hi'],
  ne: ['hi'],
  sa: ['hi'],
  ur: ['hi'],
};

/**
 * Strip Markdown tokens to make text sound natural during speech synthesis
 */
export function cleanTextForSpeech(markdown: string): string {
  return markdown
    // Remove Markdown headers
    .replace(/^#+\s+/gm, '')
    // Remove bold and italics
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove Markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet points
    .replace(/^[-*]\s+/gm, '')
    // Clean multiple newlines and spaces
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ─────────────────────────────────────────────────────────────────────────
   Shared voice registry

   The voice list loads asynchronously: in Chromium the first synchronous
   getVoices() call returns an empty array, and the `voiceschanged` event
   arrives later (or, on some builds, never). Resolving it once at module
   scope and broadcasting matters because pages like /schemes mount hundreds
   of read-aloud buttons — the previous code assigned
   `speechSynthesis.onvoiceschanged` from inside each hook instance, so every
   new button silently unsubscribed all the buttons mounted before it and
   they were left with an empty voice list forever.
   ───────────────────────────────────────────────────────────────────────── */

let voiceCache: SpeechSynthesisVoice[] = [];
const voiceSubscribers = new Set<(voices: SpeechSynthesisVoice[]) => void>();
let voiceWatchStarted = false;

function hasSpeech(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function readVoices(): SpeechSynthesisVoice[] {
  if (!hasSpeech()) return [];
  try {
    return window.speechSynthesis.getVoices() || [];
  } catch {
    return [];
  }
}

function startVoiceWatch() {
  if (voiceWatchStarted || !hasSpeech()) return;
  voiceWatchStarted = true;

  const publish = () => {
    const next = readVoices();
    if (!next.length) return;
    voiceCache = next;
    voiceSubscribers.forEach((fn) => fn(next));
  };

  publish();
  window.speechSynthesis.addEventListener('voiceschanged', publish);

  // Some Chromium builds never fire `voiceschanged`, so poll briefly too.
  let attempts = 0;
  const poll = setInterval(() => {
    publish();
    if (voiceCache.length || ++attempts > 20) clearInterval(poll);
  }, 250);
}

const normalise = (tag: string) => tag.toLowerCase().replace(/_/g, '-');
const primarySubtag = (tag: string) => normalise(tag).split('-')[0];

/**
 * Resolve the best installed voice for an app language code, or null when the
 * device has nothing that can pronounce it.
 *
 * Deliberately never falls back to English for non-English text. The old code
 * did, and because a Latin-script engine cannot render Bengali or Devanagari
 * glyphs the utterance completed instantly and silently: onstart and onend
 * both fired, no error event was raised, and the UI showed its "speaking"
 * animation over total silence. Returning null lets the caller say so.
 */
export function findVoiceFor(
  langCode: string,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const target = normalise(LANGUAGE_BCP47_MAP[langCode] || langCode || 'en-IN');
  const base = primarySubtag(target);

  const exact = voices.find((v) => normalise(v.lang) === target);
  if (exact) return exact;

  const sameLanguage = voices.find((v) => primarySubtag(v.lang) === base);
  if (sameLanguage) return sameLanguage;

  for (const sibling of SCRIPT_SIBLINGS[base] || []) {
    const siblingTag = primarySubtag(LANGUAGE_BCP47_MAP[sibling] || sibling);
    const match = voices.find((v) => primarySubtag(v.lang) === siblingTag);
    if (match) return match;
  }

  return null;
}

/**
 * Split into utterances the engine will finish. Chromium truncates long
 * utterances and stops outright after roughly fifteen seconds, so the text is
 * queued in sentence-sized pieces. Danda (।) is a sentence end in Devanagari
 * and Bengali scripts, alongside the Latin terminators.
 */
function chunkForSpeech(text: string, maxLength = 180): string[] {
  const sentences = text.match(/[^.!?।॥]+[.!?।॥]*\s*/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current && current.length + sentence.length > maxLength) {
      chunks.push(current.trim());
      current = '';
    }
    // A single sentence longer than the budget is split on word boundaries.
    if (sentence.length > maxLength) {
      if (current.trim()) chunks.push(current.trim());
      current = '';
      let piece = '';
      for (const word of sentence.split(/\s+/)) {
        if (piece && piece.length + word.length + 1 > maxLength) {
          chunks.push(piece.trim());
          piece = '';
        }
        piece += (piece ? ' ' : '') + word;
      }
      if (piece.trim()) chunks.push(piece.trim());
    } else {
      current += sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

export function useSpeechSynthesis() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(voiceCache);

  const pausedRef = useRef(false);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestIdRef = useRef(0);

  // Feature detection and the shared voice subscription are both client-only,
  // so they stay in an effect (deferred to avoid a hydration mismatch,
  // matching useSpeechRecognition's isSupported).
  useEffect(() => {
    if (!hasSpeech()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(true);
    startVoiceWatch();

    const onVoices = (next: SpeechSynthesisVoice[]) => setVoices(next);
    voiceSubscribers.add(onVoices);
    if (voiceCache.length) setVoices(voiceCache);

    return () => {
      voiceSubscribers.delete(onVoices);
    };
  }, []);

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  /** Tears down whichever of the two engines is currently producing sound. */
  const stop = useCallback(() => {
    clearKeepAlive();
    requestIdRef.current += 1; // invalidates any in-flight server synthesis
    if (hasSpeech()) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src.startsWith('blob:')) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    pausedRef.current = false;
    setIsSpeaking(false);
    setIsPaused(false);
    setIsLoading(false);
  }, [clearKeepAlive]);

  /**
   * Server-synthesised speech, for the (common) case where the device has no
   * voice for the language. Returns false if the server could not produce
   * audio, so the caller can surface that rather than fail silently.
   */
  const speakViaServer = useCallback(async (text: string, langCode: string): Promise<boolean> => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setFailed(false);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanTextForSpeech(text).slice(0, 1200), langCode }),
      });
      if (!res.ok) throw new Error('tts ' + res.status);

      const blob = await res.blob();
      // A newer request (or a stop()) superseded this one while it was in flight.
      if (requestId !== requestIdRef.current) return true;

      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onplay = () => {
        setIsLoading(false);
        setIsSpeaking(true);
      };
      const finish = () => {
        setIsSpeaking(false);
        setIsLoading(false);
        if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
        if (audioRef.current === audio) audioRef.current = null;
      };
      audio.onended = finish;
      audio.onerror = finish;
      await audio.play();
      return true;
    } catch (err) {
      if (requestId === requestIdRef.current) {
        console.warn('Server TTS unavailable:', err);
        setIsLoading(false);
        setIsSpeaking(false);
        setFailed(true);
      }
      return false;
    }
  }, []);

  /**
   * True when this device can actually pronounce the given app language.
   * Lets callers explain the situation instead of miming speech in silence.
   */
  const canSpeakLanguage = useCallback(
    (langCode: string) => !!findVoiceFor(langCode, readVoices().length ? readVoices() : voices),
    [voices]
  );

  const speak = useCallback(
    (text: string, langCode = 'en'): boolean => {
      // No Web Speech API at all (older browsers): the server can still serve.
      if (!hasSpeech()) {
        void speakViaServer(text, langCode);
        return true;
      }

      window.speechSynthesis.cancel();
      clearKeepAlive();

      const cleanText = cleanTextForSpeech(text);
      if (!cleanText) return false;

      // Read fresh — the cache may have filled since the last render.
      const live = readVoices();
      const available = live.length ? live : voices;
      const voice = findVoiceFor(langCode, available);

      // No local engine for this script. Rather than speak into the void —
      // which is what the browser does, reporting success and playing
      // nothing — hand the text to the server, which can synthesise any of
      // the supported languages.
      if (!voice) {
        void speakViaServer(text, langCode);
        return true;
      }

      const chunks = chunkForSpeech(cleanText);
      pausedRef.current = false;

      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.voice = voice;
        // Match the tag the chosen engine actually advertises, rather than a
        // tag nothing on the device can serve.
        utterance.lang = voice.lang;
        utterance.rate = 0.95; // Slightly slower for clarity
        utterance.pitch = 1.0;

        if (index === 0) {
          utterance.onstart = () => {
            setIsSpeaking(true);
            setIsPaused(false);
          };
        }

        if (index === chunks.length - 1) {
          utterance.onend = () => {
            clearKeepAlive();
            pausedRef.current = false;
            setIsSpeaking(false);
            setIsPaused(false);
          };
        }

        utterance.onerror = (e) => {
          // "interrupted"/"canceled" are the normal result of stop() or of
          // starting a new read-aloud, not failures worth reporting.
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            console.warn('Speech synthesis notice:', e.error);
          }
          clearKeepAlive();
          pausedRef.current = false;
          setIsSpeaking(false);
          setIsPaused(false);
        };

        window.speechSynthesis.speak(utterance);
      });

      // Chromium silently stops long queues after ~15s unless nudged.
      keepAliveRef.current = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearKeepAlive();
          return;
        }
        if (!pausedRef.current) window.speechSynthesis.resume();
      }, 8000);

      return true;
    },
    [voices, clearKeepAlive, speakViaServer]
  );

  const pause = useCallback(() => {
    if (!hasSpeech() || !isSpeaking) return;
    window.speechSynthesis.pause();
    pausedRef.current = true;
    setIsPaused(true);
  }, [isSpeaking]);

  const resume = useCallback(() => {
    if (!hasSpeech() || !isPaused) return;
    window.speechSynthesis.resume();
    pausedRef.current = false;
    setIsPaused(false);
  }, [isPaused]);

  // Never leave speech running after the component that started it is gone.
  useEffect(() => clearKeepAlive, [clearKeepAlive]);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    /** True while the server is synthesising — the click has registered but no sound yet. */
    isLoading,
    /** True when neither engine could produce audio for the last attempt. */
    failed,
    voices,
    speak,
    stop,
    pause,
    resume,
    canSpeakLanguage,
  };
}
