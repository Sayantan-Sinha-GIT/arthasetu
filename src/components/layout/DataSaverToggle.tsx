'use client';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';

export function DataSaverToggle() {
  const { quality, manualOverride, setManualOverride } = useNetworkQuality();
  const isOn = manualOverride || quality === 'minimal';

  return (
    <button
      type="button"
      onClick={() => setManualOverride(!isOn)}
      aria-pressed={isOn}
      title="Data Saver reduces images and animations to save mobile data"
      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-elevated cursor-pointer active:scale-95 shadow-xs"
    >
      <span aria-hidden>⚡</span>
      <span className="hidden sm:inline">Data Saver:</span> {isOn ? 'ON' : 'OFF'}
    </button>
  );
}
