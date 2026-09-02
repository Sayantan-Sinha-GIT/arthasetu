'use client';
import { useRef, useCallback, useState } from 'react';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';

export function useMagnetic(strength = 0.25) {
  const ref = useRef<HTMLButtonElement>(null);
  // Lazy initializer (not an effect): only ever affects mouse-driven
  // magnetic behavior, never the initial rendered markup, so there's no
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

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    const maxOffset = 12;
    const offsetX = Math.max(-maxOffset, Math.min(maxOffset, relX * strength));
    const offsetY = Math.max(-maxOffset, Math.min(maxOffset, relY * strength));
    el.style.transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`;
    el.style.transition = 'transform 0.1s ease-out';
  }, [strength, isDisabled]);

  const handleMouseLeave = useCallback(() => {
    if (ref.current && !isDisabled) {
      ref.current.style.transform = 'translate(0px, 0px)';
      ref.current.style.transition = 'transform 0.4s var(--ease-spring)';
    }
  }, [isDisabled]);

  return { ref, handleMouseMove, handleMouseLeave };
}
