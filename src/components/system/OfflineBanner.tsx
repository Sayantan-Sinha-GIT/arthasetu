'use client';

import { useSyncExternalStore } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/**
 * Tells the user, in their language, that what they are looking at is the copy
 * saved on their phone.
 *
 * Offline, the app now shows real data from the device rather than failing.
 * That is the right behaviour, but without a word of explanation it is also
 * indistinguishable from the data simply being current — and a user who then
 * edits their profile or asks the advisor a question deserves to know why it
 * will not go through yet.
 *
 * `pointer-events-none` so it can never sit on top of a button the user needs,
 * including the advisor's input bar.
 */
export default function OfflineBanner() {
  // The server has no notion of a connection, so it always renders online;
  // the real value is picked up on the client without a hydration mismatch.
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const { t } = useLanguage();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-28 sm:bottom-6 z-50 flex justify-center px-4"
    >
      <p className="max-w-md rounded-full border border-border bg-surface-elevated/95 px-4 py-2 text-center text-xs sm:text-sm font-semibold text-foreground shadow-xl backdrop-blur-md">
        <span aria-hidden="true" className="mr-1.5">📴</span>
        {t.errors.offlineBanner}
      </p>
    </div>
  );
}
