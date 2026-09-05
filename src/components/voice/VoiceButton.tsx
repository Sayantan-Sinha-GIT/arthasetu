'use client';

import type { VoiceState } from '@/types';

interface VoiceButtonProps {
  state: VoiceState;
  onClick: () => void;
  className?: string;
}

import { useLanguage } from '@/contexts/LanguageContext';

export default function VoiceButton({
  state,
  onClick,
  className = '',
}: VoiceButtonProps) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Main Multi-State Voice Mic Button */}
      <button
        type="button"
        id="advisor-mic-button"
        data-testid="advisor-mic-button"
        onClick={onClick}
        disabled={state === 'disconnected' || state === 'processing'}
        title={
          state === 'listening'
            ? `${t.voice.listening} ${t.voice.stop}`
            : state === 'speaking'
            ? `${t.voice.speaking} ${t.voice.stop}`
            : state === 'disconnected'
            ? t.voice.notSupported
            : t.voice.tapToSpeak
        }
        aria-label={
          state === 'listening'
            ? `${t.voice.listening} ${t.voice.stop}`
            : state === 'speaking'
            ? `${t.voice.speaking} ${t.voice.stop}`
            : state === 'disconnected'
            ? t.voice.notSupported
            : t.voice.tapToSpeak
        }
        className={`
          relative p-3 rounded-2xl border transition-all duration-300 active:scale-95 shadow-sm
          ${state === 'listening'
            ? 'bg-saffron-500 text-white border-saffron-600 ring-4 ring-saffron-500/30 animate-pulse'
            : state === 'speaking'
            ? 'bg-primary text-white border-primary-hover ring-4 ring-primary/20'
            : state === 'processing'
            ? 'bg-surface text-muted border-border cursor-wait'
            : state === 'error'
            ? 'bg-danger-light text-danger border-danger'
            : state === 'disconnected'
            ? 'bg-surface text-muted-foreground border-border opacity-50 cursor-not-allowed'
            : 'bg-surface-elevated hover:bg-surface text-muted hover:text-primary border-border hover:border-primary/40'
          }
          ${className}
        `}
      >
        {/* State 1: Listening (Pulsing Mic) */}
        {state === 'listening' && (
          <div className="flex items-center justify-center">
            <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        )}

        {/* State 2: Speaking (Soundwave bars) */}
        {state === 'speaking' && (
          <div className="flex items-center gap-0.5 h-5 px-0.5">
            <span className="w-1 bg-white rounded-full h-3 animate-pulse" />
            <span className="w-1 bg-white rounded-full h-5 animate-pulse [animation-delay:0.2s]" />
            <span className="w-1 bg-white rounded-full h-4 animate-pulse [animation-delay:0.4s]" />
            <span className="w-1 bg-white rounded-full h-2 animate-pulse [animation-delay:0.1s]" />
          </div>
        )}

        {/* State 3: Processing (Spinning loader) */}
        {state === 'processing' && (
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}

        {/* State 4: Idle, Error, or Disconnected (Standard Mic Icon) */}
        {(state === 'idle' || state === 'error' || state === 'disconnected') && (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
    </div>
  );
}
