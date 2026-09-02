'use client';
import { useRef, useState, useCallback, type CSSProperties } from 'react';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';

export function useTilt(maxTilt = 6) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});
  // Lazy initializer (not an effect): this only ever affects mouse-driven
  // tilt behavior, never the initial rendered markup, so there's no
  // hydration-mismatch risk in reading it synchronously on first render.
  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );
  let quality = 'full';
  try {
    const net = useNetworkQuality();
    quality = net.quality;
  } catch {}

  const isDisabled = reducedMotion || quality !== 'full';

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y / rect.height) - 0.5) * -maxTilt;
    const rotateY = ((x / rect.width) - 0.5) * maxTilt;
    setStyle({
      transform: `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`,
      transition: 'transform 0.1s ease-out',
      ['--glow-x' as string]: `${x}px`,
      ['--glow-y' as string]: `${y}px`,
    });
  }, [maxTilt, isDisabled]);

  const handleMouseLeave = useCallback(() => {
    if (isDisabled) return;
    setStyle({
      transform: 'perspective(800px) rotateX(0deg) rotateY(0deg)',
      transition: 'transform 0.4s var(--ease-spring)',
    });
  }, [isDisabled]);

  return { ref, style: isDisabled ? {} : style, handleMouseMove, handleMouseLeave };
}
