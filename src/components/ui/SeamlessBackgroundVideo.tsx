'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface Props {
  src: string;
}

/**
 * Two stacked <video> layers playing the same clip, crossfaded near the end
 * of each pass so the loop point is invisible. Layer B is only fetched once
 * layer A is actually playing (it then comes straight from the HTTP cache),
 * which keeps the initial network burst to a single clip.
 */
export default function SeamlessBackgroundVideo({ src }: Props) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [activeIsA, setActiveIsA] = useState(true);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
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

  // Resets/reloads the two <video> elements whenever `src` changes (theme
  // switch) — an imperative sync with the DOM video elements.
  useEffect(() => {
    crossfadeStartedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIsA(true);
    setReady(false);
    videoARef.current?.load();
    videoARef.current?.play().catch(() => {});
  }, [src]);

  // Browsers refuse autoplay in hidden or power-saving tabs, and the rejected
  // promise is silent — so nudge the active layer whenever it could newly be
  // allowed to run, rather than trusting the `autoPlay` attribute alone.
  const nudgePlay = useCallback(() => {
    const el = (activeIsA ? videoARef : videoBRef).current;
    if (el && el.paused) el.play().catch(() => {});
  }, [activeIsA]);

  useEffect(() => {
    nudgePlay();
    document.addEventListener('visibilitychange', nudgePlay);
    window.addEventListener('focus', nudgePlay);
    return () => {
      document.removeEventListener('visibilitychange', nudgePlay);
      window.removeEventListener('focus', nudgePlay);
    };
  }, [nudgePlay]);

  // Layer A is up and running: fade the stack in, and only now pull layer B
  // (served from cache) so it is buffered before the first loop point.
  const handlePlaying = useCallback(() => {
    setReady(true);
    const b = videoBRef.current;
    if (b && b.preload !== 'auto') {
      b.preload = 'auto';
      b.load();
    }
  }, []);

  if (failed || reducedMotion) return null;

  return (
    <div
      className="bg-video-wrap fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <video
        ref={videoARef}
        className="bg-video-layer"
        style={{ opacity: ready && activeIsA ? 'var(--bg-video-opacity, 1)' : 0 }}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        onPlaying={handlePlaying}
        onCanPlay={nudgePlay}
        onLoadedData={nudgePlay}
        onError={() => setFailed(true)}
      >
        <source src={src} type="video/mp4" />
      </video>
      <video
        ref={videoBRef}
        className="bg-video-layer"
        style={{ opacity: ready && !activeIsA ? 'var(--bg-video-opacity, 1)' : 0 }}
        muted
        loop
        playsInline
        preload="none"
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className="bg-video-scrim" />
      <div className="bg-video-grain" />
    </div>
  );
}
