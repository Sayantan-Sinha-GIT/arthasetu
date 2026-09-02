'use client';

import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useLanguage } from '@/contexts/LanguageContext';

interface TextToSpeechButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md';
  label?: string;
}

export default function TextToSpeechButton({
  text,
  className = '',
  size = 'sm',
  label,
}: TextToSpeechButtonProps) {
  const { language, t } = useLanguage();
  const { isSpeaking, isLoading, failed, speak, stop } = useSpeechSynthesis();

  const isSmall = size === 'sm';
  const busy = isSpeaking || isLoading;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) {
      stop();
    } else {
      speak(text, language);
    }
  };

  // Only shown once an attempt has actually failed — most devices have no
  // voice for these languages, but the server can still synthesise them, so
  // the control stays available until something genuinely goes wrong.
  const unavailable =
    t.tts?.voiceUnavailable ||
    'Read-aloud is unavailable because your device has no voice installed for this language.';

  const title = failed
    ? unavailable
    : isSpeaking
      ? t.tts?.stopReadAloud || 'Stop read-aloud'
      : t.tts?.readAloudWithVoice || 'Read aloud with voice';

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={failed}
      title={title}
      aria-label={title}
      aria-busy={isLoading}
      className={`
        inline-flex items-center gap-1.5 rounded-xl font-bold transition-all
        ${
          isSpeaking
            ? 'bg-saffron-500 text-white shadow-md shadow-saffron-500/30 animate-pulse'
            : failed
              ? 'bg-surface border border-border-subtle text-muted opacity-70 cursor-not-allowed'
              : 'bg-surface-elevated hover:bg-surface border border-border text-foreground hover:border-primary/40'
        }
        ${isSmall ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm'}
        ${className}
      `}
    >
      {isSpeaking ? (
        <>
          {/* Animated Waveform Bars */}
          <div className="flex items-center gap-0.5 h-3">
            <span className="w-0.5 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-0.5 h-3.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-0.5 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <span>{t.tts?.stopVoice || 'Stop Voice'}</span>
        </>
      ) : isLoading ? (
        <>
          {/* Server synthesis takes a couple of seconds; without this the
              button looks inert and invites a second click. */}
          <svg
            className={`animate-spin ${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-primary`}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>{label || t.tts?.readAloud || 'Read Aloud'}</span>
        </>
      ) : (
        <>
          <svg
            className={isSmall ? 'w-3.5 h-3.5 text-primary' : 'w-4 h-4 text-primary'}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            {failed ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.21-1.605.572-2.288.234-.847 1.058-1.354 1.938-1.354h2.24z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.21-1.605.572-2.288.234-.847 1.058-1.354 1.938-1.354h2.24z"
              />
            )}
          </svg>
          <span>{label || t.tts?.readAloud || 'Read Aloud'}</span>
        </>
      )}
    </button>
  );
}
