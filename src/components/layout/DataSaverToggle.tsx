'use client';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function DataSaverToggle() {
  const { t } = useLanguage();
  const { quality, setPreference } = useNetworkQuality();
  const isOn = quality !== 'full';

  return (
    <button
      type="button"
      onClick={() => setPreference(isOn ? 'off' : 'on')}
      aria-pressed={isOn}
      title={t.common.dataSaverDesc}
      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-elevated cursor-pointer active:scale-95 shadow-xs"
    >
      <span aria-hidden>⚡</span>
      <span className="hidden sm:inline">{t.common.dataSaver}:</span> {isOn ? t.common.on : t.common.off}
    </button>
  );
}
