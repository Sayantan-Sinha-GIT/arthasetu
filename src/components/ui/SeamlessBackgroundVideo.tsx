'use client';

import { useRef, useState, useEffect } from 'react';

interface Props {
  src: string;
}

/**
 * Single ambient background <video> element per theme.
 * Uses native looping with watchdog event listeners (onPause, onEnded)
 * for maximum reliability.
 */
export default function SeamlessBackgroundVideo({ src }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Nudge play on visibility/focus change in case background tab throttling pauses playback
  useEffect(() => {
    const nudge = () => {
      const el = videoRef.current;
      if (el && el.paused) {
        el.play().catch(() => {});
      }
    };
    nudge();
    document.addEventListener('visibilitychange', nudge);
    window.addEventListener('focus', nudge);
    return () => {
      document.removeEventListener('visibilitychange', nudge);
      window.removeEventListener('focus', nudge);
    };
  }, []);

  if (failed || reducedMotion) return null;

  return (
    <div
      className="bg-video-wrap fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        className="bg-video-layer"
        style={{ opacity: ready ? 'var(--bg-video-opacity, 1)' : 0 }}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        onPlaying={() => setReady(true)}
        onLoadedData={() => setReady(true)}
        onPause={(e) => {
          e.currentTarget.play().catch(() => {});
        }}
        onEnded={(e) => {
          e.currentTarget.currentTime = 0;
          e.currentTarget.play().catch(() => {});
        }}
        onError={() => setFailed(true)}
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className="bg-video-scrim" />
      <div className="bg-video-grain" />
    </div>
  );
}
