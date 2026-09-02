'use client';
import { useState, useEffect, useRef } from 'react';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';

export default function BackgroundVideo({ src, className = '' }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  let quality = 'full';
  try {
    const net = useNetworkQuality();
    quality = net.quality;
  } catch {}

  // Deferred to an effect (rather than a lazy useState initializer) so
  // server and first client render both render the video, avoiding a
  // hydration mismatch — `reducedMotion` here gates whether we render at
  // all (see below), so it must match between server and first client paint.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  if (failed || reducedMotion || quality !== 'full') return null;

  return (
    <video
      ref={videoRef}
      className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${className}`}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      onError={() => setFailed(true)}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
