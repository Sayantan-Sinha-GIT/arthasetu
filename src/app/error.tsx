'use client';

import { useEffect } from 'react';

// Route-segment error boundary. Catches any otherwise-uncaught render error
// anywhere in the app (e.g. a translation key crash, a bad API response
// shape) and shows a recoverable screen instead of leaving the browser on a
// dead/blank page. Deliberately has NO dependency on LanguageContext or any
// other app context — if something upstream is broken, this must still work.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('ArthaSetu unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950 px-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
            Something went wrong / कुछ गड़बड़ हो गई
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            An unexpected error occurred. Please try again.
            <br />
            एक अनपेक्षित समस्या हुई। कृपया फिर से प्रयास करें।
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Try Again / फिर से प्रयास करें
          </button>
          <a
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          >
            Go Home / होम पर जाएं
          </a>
        </div>
      </div>
    </div>
  );
}
