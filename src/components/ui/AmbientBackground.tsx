'use client';

import { useNetworkQuality } from '@/contexts/NetworkQualityContext';

interface AmbientBackgroundProps {
  className?: string;
  variant?: 'hero' | 'card' | 'subtle';
  grain?: boolean;
}

export default function AmbientBackground({
  className = '',
  variant = 'hero',
  grain = false,
}: AmbientBackgroundProps) {
  let quality = 'full';
  try {
    const net = useNetworkQuality();
    quality = net.quality;
  } catch {}

  // On minimal network quality, do not render orbs at all
  if (quality === 'minimal') {
    return grain ? (
      <div data-ambient="" aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
        <div className="grain-overlay" />
      </div>
    ) : null;
  }

  const isAnimated = quality === 'full';
  const animDriftBold = isAnimated ? 'animate-ambient-drift-bold' : '';
  const animDriftSlow = isAnimated ? 'animate-ambient-drift-bold-slow' : '';

  if (variant === 'card') {
    return (
      <div data-ambient="" aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-0 overflow-hidden rounded-3xl ${className}`}>
        <div className={`absolute top-0 right-0 w-80 h-80 bg-saffron-500/25 rounded-full blur-3xl ${animDriftBold}`} />
        <div className={`absolute -bottom-10 -left-10 w-72 h-72 bg-blue-500/22 rounded-full blur-2xl ${animDriftSlow}`} />
      </div>
    );
  }

  if (variant === 'subtle') {
    return (
      <div data-ambient="" aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
        <div className={`absolute top-10 left-10 w-72 h-72 bg-saffron-400/16 rounded-full blur-3xl ${animDriftBold}`} />
        <div className={`absolute bottom-10 right-10 w-80 h-80 bg-navy-500/16 rounded-full blur-3xl ${animDriftSlow}`} />
      </div>
    );
  }

  return (
    <div data-ambient="" aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <div className={`absolute top-16 left-8 w-80 h-80 sm:w-[28rem] sm:h-[28rem] bg-saffron-400/20 dark:bg-saffron-500/32 rounded-full blur-3xl ${animDriftBold}`} />
      <div className={`absolute bottom-16 right-8 w-96 h-96 sm:w-[28rem] sm:h-[28rem] bg-navy-500/18 dark:bg-navy-400/30 rounded-full blur-3xl ${animDriftSlow}`} />
      <div className={`absolute top-36 right-1/3 w-56 h-56 sm:w-72 sm:h-72 bg-saffron-300/15 dark:bg-saffron-300/12 rounded-full blur-2xl ${animDriftBold}`} />
      {grain && <div className="grain-overlay" />}
    </div>
  );
}
