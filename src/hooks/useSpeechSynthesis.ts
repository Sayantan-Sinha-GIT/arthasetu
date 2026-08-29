'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * BCP-47 Locale Map for all 22 Official Scheduled Indian Languages + English
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

export function useSpeechSynthesis() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, []);

  const speak = useCallback((text: string, langCode = 'en') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Stop any ongoing utterance
    window.speechSynthesis.cancel();

    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    currentUtteranceRef.current = utterance;

    // Resolve target BCP-47 tag
    const targetTag = LANGUAGE_BCP47_MAP[langCode] || langCode || 'en-IN';
    utterance.lang = targetTag;

    // Find best voice match
    const matchingVoice = voices.find((v) =>
      v.lang.toLowerCase().replace('_', '-').includes(targetTag.toLowerCase())
    ) || voices.find((v) =>
      v.lang.toLowerCase().includes(targetTag.slice(0, 2))
    ) || voices.find((v) =>
      v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('hi-in')
    );

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis notice:', e);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [voices]);

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSpeaking]);

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    speak,
    stop,
    pause,
    resume,
  };
}
