'use client';

import { useEffect, useState } from 'react';

interface CountUpProps {
  start?: number;
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
}

/**
 * Animated numeric counter using requestAnimationFrame with an ease-out curve.
 * - Renders the final target value immediately if `prefers-reduced-motion` is active.
 * - Supports custom prefix/suffix, decimal places, and duration.
 */
export default function CountUp({
  start = 0,
  end,
  duration = 1000,
  prefix = '',
  suffix = '',
  className = '',
  decimals = 0,
}: CountUpProps) {
  const [currentValue, setCurrentValue] = useState<number>(() => {
    // If reduced motion or initial SSR, start at target if needed or start
    return start;
  });

  useEffect(() => {
    // 1. Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentValue(end);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const startValue = start;
    const diff = end - startValue;

    // Cubic ease-out: 1 - (1 - t)^3
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const nextVal = startValue + diff * easedProgress;
      setCurrentValue(nextVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCurrentValue(end);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [start, end, duration]);

  const formatted = decimals > 0 ? currentValue.toFixed(decimals) : Math.round(currentValue).toLocaleString('en-IN');

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
