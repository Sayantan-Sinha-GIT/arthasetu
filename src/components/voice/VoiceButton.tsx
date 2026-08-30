'use client';

import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import type { VoiceState } from '@/types';

interface VoiceButtonProps {
  state: VoiceState;
  onClick: () => void;
  onLanguageChange?: (speechCode: string) => void;
  speechLanguage?: string;
  className?: string;
  selectAriaLabel?: string;
}

export default function VoiceButton({
  state,
  onClick,
  onLanguageChange,
  speechLanguage = 'en-IN',
  className = '',
  selectAriaLabel = 'Voice Input Language',
}: VoiceButtonProps) {
  const currentLangMeta =
    SUPPORTED_LANGUAGES.find((l) => l.speechCode === speechLanguage) ||
    SUPPORTED_LANGUAGES.find((l) => l.speechCode.toLowerCase() === speechLanguage.toLowerCase()) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Speech Language Dropdown Picker */}
      {onLanguageChange && state !== 'disconnected' && (
        <div className="relative inline-flex items-center shrink-0">
          <label htmlFor="voice-language-picker" className="sr-only">
            {selectAriaLabel}
          </label>
          <select
            id="voice-language-picker"
            data-testid="voice-language-picker"
            value={speechLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={state === 'listening' || state === 'processing'}
            className="text-[11px] font-bold py-2 pl-2.5 pr-6 rounded-2xl border bg-surface-elevated text-foreground border-border hover:border-primary/50 focus:border-primary transition-all cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[120px] sm:max-w-[150px] truncate shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Speech Language: ${currentLangMeta.nativeName} (${currentLangMeta.name}) [${speechLanguage}]`}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.speechCode}>
                🎙️ {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-muted">
            ▼
          </div>
        </div>
      )}

      {/* Main Multi-State Voice Mic Button */}
      <button
        type="button"
        id="advisor-mic-button"
        data-testid="advisor-mic-button"
        onClick={onClick}
        disabled={state === 'disconnected' || state === 'processing'}
        title={
          state === 'listening'
            ? 'Listening... Tap to finish'
            : state === 'speaking'
            ? 'ArthaSetu is speaking. Tap to stop'
            : state === 'disconnected'
            ? 'Voice recognition not supported in this browser'
            : `Tap to speak in ${currentLangMeta.nativeName} (${currentLangMeta.name})`
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
