'use client';

import { useEffect } from 'react';

const INTRO_STORAGE_KEY = 'as-intro-shown';

/** Kept in step with the `transition` on #as-boot in BootScreen. */
const FADE_MS = 400;

/**
 * How long the brand screen stays up when the app was already warm. Long
 * enough to register as an intro, short enough not to feel like a toll gate.
 */
const MIN_VISIBLE_MS = 650;

/**
 * Takes down the server-rendered boot screen (see `BootScreen`).
 *
 * This used to be the splash itself — a client component that mounted, waited
 * 750ms and faded. That put the branding AFTER hydration, which is the one
 * moment it was not needed: by then the app is ready to draw. Everything before
 * it, the part the user actually waits through, was blank. The splash now ships
 * in the HTML and this only decides when it goes away.
 *
 * The hold is measured from the start of the navigation rather than from mount,
 * so a slow connection is never charged twice. If hydration took two seconds the
 * user has already served the wait and the screen is dismissed immediately; the
 * minimum only applies when the app came back fast enough that dropping the
 * splash instantly would read as a flicker.
 */
export default function IntroSplash() {
  useEffect(() => {
    // Flags on <html>, not a removal: the boot screen is server-rendered inside
    // the root layout, so React owns that node and deleting it out from under
    // React risks a reconciliation error on the next render. This is the same
    // mechanism the inline theme script and the Data Saver class already use.
    const root = document.documentElement;
    if (root.classList.contains('as-boot-done')) return;

    const settle = () => {
      try {
        sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');
      } catch {
        // Private browsing can refuse storage; the splash still works, it just
        // does not remember that it has played.
      }
    };

    let alreadyPlayed = false;
    try {
      alreadyPlayed = sessionStorage.getItem(INTRO_STORAGE_KEY) === 'true';
    } catch {
      // Treat an unreadable store as a first run.
    }

    let reducedMotion = false;
    try {
      reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      // matchMedia is universally available; the guard is only for exotic embeds.
    }

    // performance.now() is milliseconds since the navigation started, which is
    // the same clock the user has been watching the boot screen on.
    const onScreenFor = performance.now();
    const hold =
      alreadyPlayed || reducedMotion ? 0 : Math.max(0, MIN_VISIBLE_MS - onScreenFor);

    let doneTimer: ReturnType<typeof setTimeout>;
    const fadeTimer = setTimeout(() => {
      root.classList.add('as-boot-out');
      doneTimer = setTimeout(() => {
        root.classList.add('as-boot-done');
        settle();
      }, FADE_MS);
    }, hold);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return null;
}
