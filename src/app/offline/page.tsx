import type { Metadata } from 'next';
import { BOOT_LOGO_DATA_URI } from '@/lib/boot-logo';

export const metadata: Metadata = {
  title: 'No connection',
};

/**
 * Served by the service worker when a page is requested with no network and
 * nothing cached for it.
 *
 * Written the same way as the boot screen — inline styles, inlined mark, no
 * client JavaScript — because it has to render from the cache alone, in the one
 * situation where nothing else can be fetched to help it.
 */
export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FDF5E3',
        color: '#2A1A0F',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: '#F5EEE1',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BOOT_LOGO_DATA_URI} alt="ArthaSetu" width={55} height={44} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>
          You are offline
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.75, margin: '0 0 6px' }}>
          ArthaSetu needs a connection for this page. Pages you have already
          opened still work.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.75, margin: 0 }}>
          आप ऑफ़लाइन हैं — कनेक्शन वापस आने पर दोबारा कोशिश करें।
        </p>
      </div>
    </div>
  );
}
