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

    // Asks the worker to save every screen ahead of time, so going offline
    // never lands on a screen it cannot answer — which is where Chrome shows its
    // own, possibly weeks-old, copy instead. Once per deployment rather than per
    // launch, keyed on the build ID next.config.ts bakes in. Skipped when the
    // user has turned Data Saver on or the browser is asking to save data; their
    // visited screens are still saved as they go.
    //
    // The marker is written only when the worker replies that it has finished.
    // During an upgrade the page is still controlled by the PREVIOUS worker,
    // which does not understand this request and silently ignores it — so
    // recording success on send meant no phone that already had the app ever
    // saved its screens. The request is repeated on `controllerchange`, when the
    // new worker takes over — and FORCED then, ignoring the marker, because the
    // job the marker records may have been done by the old worker under its
    // older rules (it was: the logo sizes added later were never saved). After
    // the first run a forced repeat only re-fetches the HTML; saved files are
    // skipped.
    const warm = (force = false) => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection;
      let dataSaverOn = false;
      let alreadyWarmed = false;
      // The page's first script URL was used here before, but it need not
      // change when only one screen's code does, which would leave that
      // screen's older copy on phones offline.
      const build = process.env.ARTHASETU_BUILD_ID ?? '';
      try {
        dataSaverOn = localStorage.getItem('arthasetu-data-saver-pref') === 'on';
        alreadyWarmed = localStorage.getItem('arthasetu-warmed-build') === build;
      } catch {
        // Unreadable storage: warm anyway, it is only a cache.
      }
      if (connection?.saveData || dataSaverOn || (alreadyWarmed && !force)) return;

      // Not controlled yet on a first visit; `controllerchange` calls back in.
      const worker = navigator.serviceWorker.controller;
      if (!worker) return;

      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data !== 'arthasetu-warmed') return;
        try {
          localStorage.setItem('arthasetu-warmed-build', build);
        } catch {
          // Without the marker it simply warms again next launch.
        }
      };
      worker.postMessage('arthasetu-warm', [channel.port2]);
    };

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(() => warm()).catch(() => {
        // An unavailable worker is not a failure the user needs to hear about —
        // the app simply falls back to fetching everything over the network.
      });
    };

    const onTakeover = () => warm(true);
    navigator.serviceWorker.addEventListener('controllerchange', onTakeover);

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
    }

    return () => {
      window.removeEventListener('load', register);
      navigator.serviceWorker.removeEventListener('controllerchange', onTakeover);
    };
  }, []);

  return null;
}
