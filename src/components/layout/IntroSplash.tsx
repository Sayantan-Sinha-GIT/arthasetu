'use client';

import { useEffect, useState } from 'react';

const INTRO_STORAGE_KEY = 'as-intro-shown';

/**
 * Branded Intro Animation Component
 *
 * Displays a non-blocking, session-only brand introduction on fresh app loads.
 * - Checks `sessionStorage` on mount; never plays more than once per tab session.
 * - Bypassed immediately if `prefers-reduced-motion` is active.
 * - Fades out smoothly after ~1000ms total and unmounts from the DOM.
 */
export default function IntroSplash() {
  const [showSplash, setShowSplash] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    try {
      // 1. If already shown in this tab session, do not render
      const alreadyShown = sessionStorage.getItem(INTRO_STORAGE_KEY);
      if (alreadyShown) {
        return;
      }

      // 2. If user prefers reduced motion, set flag and do not render animation
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
        return;
      }

      // 3. Trigger initial display
      setShowSplash(true);

      // 4. Begin fade out after 750ms
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 750);

      // 5. Complete removal and persist flag after 1050ms total
      const hideTimer = setTimeout(() => {
        setShowSplash(false);
        try {
          sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
        } catch {
          // Ignore storage quota/security errors in incognito edge cases
        }
      }, 1050);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    } catch {
      // Fail safely if sessionStorage is unavailable
      setShowSplash(false);
    }
  }, []);

  if (!showSplash) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={`
        fixed inset-0 z-50 flex items-center justify-center bg-[#080F20]
        pointer-events-none transition-opacity duration-300
        ${isFadingOut ? 'opacity-0' : 'opacity-100'}
      `}
      style={{ transitionTimingFunction: 'var(--ease-smooth)' }}
    >
      <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 animate-slide-up">
        {/* Emblem */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center shadow-2xl shadow-saffron-500/30">
          <span className="text-white font-bold text-3xl sm:text-4xl">अ</span>
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ArthaSetu <span className="text-saffron-400 text-xl sm:text-2xl font-bold font-sans">| अर्थसेतु</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide">
            Your Business • Your Language • Your Plan
          </p>
        </div>
      </div>
    </div>
  );
}
