'use client';

import { useEffect } from 'react';

// Last-resort boundary: catches errors thrown by the ROOT layout itself
// (fonts, providers, etc.), which src/app/error.tsx cannot catch since it
// lives inside that same layout. Must render its own <html>/<body> because
// it fully replaces the root layout when active.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('ArthaSetu fatal root error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            padding: '24px',
          }}
        >
          <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#171717', margin: '0 0 8px' }}>
              ArthaSetu couldn&apos;t load / अर्थसेतु लोड नहीं हो सका
            </h1>
            <p style={{ fontSize: 14, color: '#737373', margin: '0 0 20px' }}>
              Something went wrong. Please reload the page.
              <br />
              कुछ गड़बड़ हो गई। कृपया पेज को दोबारा लोड करें।
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                background: '#f97316',
                color: '#fff',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload / दोबारा लोड करें
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
