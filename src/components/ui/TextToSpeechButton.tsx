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
  const { language } = useLanguage();
  const { isSupported, isSpeaking, speak, stop } = useSpeechSynthesis();

  if (!isSupported) return null;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      stop();
    } else {
      speak(text, language);
    }
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isSpeaking ? 'Stop read-aloud' : 'Read aloud with voice'}
      aria-label={isSpeaking ? 'Stop read-aloud' : 'Read aloud with voice'}
      className={`
        inline-flex items-center gap-1.5 rounded-xl font-bold transition-all
        ${isSpeaking
          ? 'bg-saffron-500 text-white shadow-md shadow-saffron-500/30 animate-pulse'
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
          <span>Stop Voice</span>
        </>
      ) : (
        <>
          <svg
            className={isSmall ? 'w-3.5 h-3.5 text-primary' : 'w-4 h-4 text-primary'}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.21-1.605.572-2.288.234-.847 1.058-1.354 1.938-1.354h2.24z"
            />
          </svg>
          <span>{label || 'Read Aloud'}</span>
        </>
      )}
    </button>
  );
}
