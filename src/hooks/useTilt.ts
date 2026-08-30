'use client';
import { useRef, useState, useCallback, useEffect, type CSSProperties } from 'react';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';

export function useTilt(maxTilt = 6) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});
  const [reducedMotion, setReducedMotion] = useState(false);
  let quality = 'full';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const net = useNetworkQuality();
    quality = net.quality;
  } catch {}

  const isDisabled = reducedMotion || quality !== 'full';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

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
