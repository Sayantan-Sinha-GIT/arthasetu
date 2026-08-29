'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Declare Web Speech API interface for TypeScript
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  defaultLanguage?: string;
}

export function useSpeechRecognition({
  onResult,
  onError,
  defaultLanguage = 'hi-IN',
}: UseSpeechRecognitionOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  });

  // Check browser support on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as IWindow;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        setIsSupported(true);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping recognition:', err);
      }
    }
    setIsListening(false);
  }, [isListening]);

  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.warn('Error aborting recognition:', err);
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback((lang?: string) => {
    if (typeof window === 'undefined') return;

    const win = window as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError('Speech recognition is not supported in this browser.');
      if (onErrorRef.current) {
        onErrorRef.current('Speech recognition is not supported in this browser.');
      }
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    setError(null);
    setIsPermissionDenied(false);
    setInterimTranscript('');

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      // Configuration
      recognition.continuous = false; // Stop after a complete thought
      recognition.interimResults = true; // Show live words while speaking
      recognition.maxAlternatives = 1;
      recognition.lang = lang || defaultLanguage;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            currentFinal += res[0].transcript;
          } else {
            currentInterim += res[0].transcript;
          }
        }

        setInterimTranscript(currentInterim);

        if (currentFinal) {
          const trimmedFinal = currentFinal.trim();
          setTranscript(trimmedFinal);
          if (onResultRef.current) {
            onResultRef.current(trimmedFinal);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        let errorMsg = 'An error occurred during speech recognition.';

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsPermissionDenied(true);
          errorMsg = 'Microphone access was denied. Please allow microphone permissions in your browser.';
        } else if (event.error === 'no-speech') {
          errorMsg = 'No speech detected. Please tap the mic and speak clearly.';
        } else if (event.error === 'network') {
          errorMsg = 'Network error while connecting to speech recognition service.';
        }

        setError(errorMsg);
        setIsListening(false);
        if (onErrorRef.current) {
          onErrorRef.current(errorMsg);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      const msg = 'Could not start speech recognition. Please check your microphone settings.';
      setError(msg);
      setIsListening(false);
      if (onErrorRef.current) {
        onErrorRef.current(msg);
      }
    }
  }, [defaultLanguage]);

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
