'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface Props {
  src: string;
  overlayClassName?: string;
}

export default function SeamlessBackgroundVideo({ src, overlayClassName = '' }: Props) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [activeIsA, setActiveIsA] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const crossfadeStartedRef = useRef(false);

  // Deferred to an effect (rather than a lazy useState initializer) so
  // server and first client render both render the video, avoiding a
  // hydration mismatch — `reducedMotion` gates whether we render at all
  // (see below). Also subscribes to live changes, which needs an effect regardless.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const attachTimeUpdateListener = useCallback(
    (active: HTMLVideoElement, next: HTMLVideoElement, toA: boolean, duration: number) => {
      // Crossfade window: 15% of clip length, clamped between 0.4s and 1.2s
      const fade = Math.min(1.2, Math.max(0.4, duration * 0.15));
      const onTimeUpdate = () => {
        if (crossfadeStartedRef.current) return;
        if (active.currentTime >= duration - fade) {
          crossfadeStartedRef.current = true;
          next.currentTime = 0;
          next.play().catch(() => {});
          setActiveIsA(toA);
          active.removeEventListener('timeupdate', onTimeUpdate);
        }
      };
      active.addEventListener('timeupdate', onTimeUpdate);
      return () => active.removeEventListener('timeupdate', onTimeUpdate);
    },
    []
  );

  const scheduleCrossfade = useCallback(
    (active: HTMLVideoElement, next: HTMLVideoElement, toA: boolean) => {
      if (active.readyState >= 1 && isFinite(active.duration) && active.duration > 0) {
        return attachTimeUpdateListener(active, next, toA, active.duration);
      }
      let timeUpdateCleanup: (() => void) | undefined;
      const onMeta = () => {
        if (isFinite(active.duration) && active.duration > 0) {
          timeUpdateCleanup = attachTimeUpdateListener(active, next, toA, active.duration);
        }
      };
      active.addEventListener('loadedmetadata', onMeta, { once: true });
      return () => {
        active.removeEventListener('loadedmetadata', onMeta);
        timeUpdateCleanup?.();
      };
    },
    [attachTimeUpdateListener]
  );

  useEffect(() => {
    crossfadeStartedRef.current = false;
    const a = videoARef.current;
    const b = videoBRef.current;
    if (!a || !b) return;
    const cleanupA = activeIsA ? scheduleCrossfade(a, b, false) : undefined;
    const cleanupB = !activeIsA ? scheduleCrossfade(b, a, true) : undefined;
    return () => {
      cleanupA?.();
      cleanupB?.();
    };
  }, [activeIsA, scheduleCrossfade, src]);

  // Resets/reloads the two <video> elements whenever `src` changes — an
  // imperative sync with the DOM video elements, which needs an effect.
  useEffect(() => {
    // reset both layers whenever src changes (theme switch)
    crossfadeStartedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIsA(true);
    videoARef.current?.load();
    videoBRef.current?.load();
    videoARef.current?.play().catch(() => {});
  }, [src]);

  if (failed || reducedMotion) return null;

  const baseClass = 'fixed inset-0 w-full h-full object-cover transition-opacity duration-700 ease-linear pointer-events-none';

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <video
        ref={videoARef}
        className={`${baseClass} ${activeIsA ? 'opacity-100' : 'opacity-0'}`}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        onError={() => setFailed(true)}
      >
        <source src={src} type="video/mp4" />
      </video>
      <video
        ref={videoBRef}
        className={`${baseClass} ${activeIsA ? 'opacity-0' : 'opacity-100'}`}
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className={`fixed inset-0 pointer-events-none ${overlayClassName}`} />
    </div>
  );
}
