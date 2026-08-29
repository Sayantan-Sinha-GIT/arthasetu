'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceVisualizerProps {
  isListening: boolean;
  interimTranscript: string;
  speechLanguage?: string;
  onStop: () => void;
  onCancel: () => void;
}

export default function VoiceVisualizer({
  isListening,
  interimTranscript,
  speechLanguage = 'en-IN',
  onStop,
  onCancel,
}: VoiceVisualizerProps) {
  const { t } = useLanguage();

  if (!isListening) return null;

  const isEnglish = speechLanguage.toLowerCase().startsWith('en');

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-saffron-500/15 via-primary/10 to-saffron-500/15 border border-saffron-400/40 animate-slide-up shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Waveform animation + live text */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Animated sound wave bars */}
          <div className="flex items-center gap-1 h-6 shrink-0">
            <span className="w-1 bg-saffron-500 rounded-full h-3 animate-pulse" />
            <span className="w-1 bg-saffron-500 rounded-full h-6 animate-pulse [animation-delay:0.15s]" />
            <span className="w-1 bg-saffron-500 rounded-full h-4 animate-pulse [animation-delay:0.3s]" />
            <span className="w-1 bg-saffron-500 rounded-full h-5 animate-pulse [animation-delay:0.45s]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-saffron-600 dark:text-saffron-400">
                {t.voice.listening} ({isEnglish ? 'English' : speechLanguage.toUpperCase()})
              </span>
            </div>
            <p className="text-xs text-foreground font-medium truncate mt-0.5">
              {interimTranscript ? `"${interimTranscript}"` : t.voice.tapToSpeak + '...'}
            </p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onStop}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm transition-all"
          >
            ✓ Done Speaking
          </button>
        </div>
      </div>
    </div>
  );
}
