'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type NetworkQuality = 'full' | 'reduced' | 'minimal';
export type Preference = 'auto' | 'on' | 'off';

interface NetworkQualityContextType {
  quality: NetworkQuality;
  detectedQuality: NetworkQuality;
  preference: Preference;
  setPreference: (p: Preference) => void;
}

const NetworkQualityContext = createContext<NetworkQualityContextType | undefined>(undefined);

// Minimal shape of the (still non-standard, Chromium-only) Network
// Information API — not in the DOM lib types.
interface INetworkInformation {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
}

function classify(
  effectiveType: string | undefined,
  saveData: boolean | undefined,
  downlink: number | undefined
): NetworkQuality {
  if (saveData) return 'minimal';
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'minimal';
  if (effectiveType === '3g') return 'reduced';
  if (typeof downlink === 'number' && downlink > 0 && downlink < 0.5) return 'reduced';
  return 'full';
}

export function NetworkQualityProvider({ children }: { children: ReactNode }) {
  const [detected, setDetected] = useState<NetworkQuality>('full');
  const [preference, setPreferenceState] = useState<Preference>('auto');
  const [showAutoToast, setShowAutoToast] = useState(false);

  // Reads localStorage/the Network Information API and (in the fallback
  // branch) fetches a probe request — all client-only, and `detected`/
  // `preference` gate UI behavior across the app, so this has to stay an
  // effect rather than a lazy initializer to avoid a hydration mismatch.
  useEffect(() => {
    const saved = localStorage.getItem('arthasetu-data-saver-pref');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === 'auto' || saved === 'on' || saved === 'off') {
      setPreferenceState(saved);
    }

    const nav = navigator as Navigator & {
      connection?: INetworkInformation;
      mozConnection?: INetworkInformation;
      webkitConnection?: INetworkInformation;
    };
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    const evaluate = (q: NetworkQuality) => {
      setDetected(q);
      if (q === 'minimal') {
        const notified = sessionStorage.getItem('arthasetu-data-saver-notified');
        if (!notified) {
          sessionStorage.setItem('arthasetu-data-saver-notified', 'true');
          setShowAutoToast(true);
        }
      }
    };

    if (conn) {
      const update = () => evaluate(classify(conn.effectiveType, conn.saveData, conn.downlink));
      update();
      conn.addEventListener?.('change', update);
      return () => conn.removeEventListener?.('change', update);
    } else {
      // Fallback heuristic for browsers without the Network Information API (e.g. iOS Safari)
      const start = performance.now();
      fetch('/favicon.ico', { cache: 'no-store' })
        .then(() => {
          const elapsed = performance.now() - start;
          if (elapsed > 2500) evaluate('minimal');
          else if (elapsed > 1200) evaluate('reduced');
          else evaluate('full');
        })
        .catch(() => {});
    }
  }, []);

  // Auto-hide toast after 6 seconds
  useEffect(() => {
    if (!showAutoToast) return;
    const timer = setTimeout(() => {
      setShowAutoToast(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [showAutoToast]);

  const setPreference = (p: Preference) => {
    setPreferenceState(p);
    // Only ever called from a user-triggered browser event, so window/localStorage are always available here.
    localStorage.setItem('arthasetu-data-saver-pref', p);
  };

  const quality: NetworkQuality =
    preference === 'auto' ? detected :
    preference === 'on' ? 'minimal' :
    'full';

  return (
    <NetworkQualityContext.Provider
      value={{
        quality,
        detectedQuality: detected,
        preference,
        setPreference,
      }}
    >
      {children}

      {/* Dismissible Session Toast on Auto Minimal Quality */}
      {showAutoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 max-w-sm p-4 rounded-2xl bg-surface-elevated border border-border shadow-xl text-foreground text-xs sm:text-sm animate-slide-up flex items-start gap-3 backdrop-blur-md"
        >
          <span className="text-base shrink-0">⚡</span>
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-foreground">Data Saver Mode Active</p>
            <p className="text-muted text-xs leading-relaxed">
              We noticed a slow connection and simplified the page to keep things fast. You can change this anytime in your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAutoToast(false)}
            className="text-muted hover:text-foreground p-1 rounded-lg hover:bg-surface cursor-pointer text-xs font-bold"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}
    </NetworkQualityContext.Provider>
  );
}

export function useNetworkQuality() {
  const ctx = useContext(NetworkQualityContext);
  if (!ctx) {
    throw new Error('useNetworkQuality must be used within NetworkQualityProvider');
  }
  return ctx;
}
