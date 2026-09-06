'use client';

import { useEffect } from 'react';

/**
 * Registers `public/sw.js`, which is what makes the app cheap to open twice.
 *
 * Deliberately registered after `load` rather than on mount: during the first
 * visit the network is already the bottleneck, and the worker has nothing to
 * serve yet, so competing with the page for that bandwidth would make the very
 * problem it exists to fix slightly worse. From the second launch onward it is
 * already installed and this timing costs nothing.
 *
 * `?nosw=1` unregisters it and empties every cache. A caching layer that cannot
 * be switched off from the address bar is a bad thing to take to a demo.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (new URLSearchParams(window.location.search).has('nosw')) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      }
      return;
    }

    // The dev server serves modules the worker has no business caching, and a
    // stale chunk there looks like a code bug rather than a cache.
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // An unavailable worker is not a failure the user needs to hear about —
        // the app simply falls back to fetching everything over the network.
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
