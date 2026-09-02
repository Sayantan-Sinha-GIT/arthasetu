'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';
import SeamlessBackgroundVideo from './SeamlessBackgroundVideo';

/**
 * Mounted once, globally (see src/app/providers.tsx).
 *
 * Renders the ambient background clip on every route except the homepage,
 * which keeps its own hero treatment. Users on Data Saver — or on a
 * connection we auto-classified as slow — never download the video at all.
 */
export default function PageBackgroundVideo() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const { quality } = useNetworkQuality();

  // ThemeProvider resolves the real theme in an effect, so the very first
  // render always reports 'light'. Waiting a beat keeps us from fetching the
  // wrong clip and immediately throwing it away.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const active = mounted && pathname !== '/' && quality === 'full';

  // Signals the rest of the stylesheet that a video sits behind the page, so
  // <body> and the page shells go transparent and cards turn to frosted glass.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('has-bg-video', active);
    return () => root.classList.remove('has-bg-video');
  }, [active]);

  if (!active) return null;

  const src = theme === 'dark' ? '/videos/dark-mode-video.mp4' : '/videos/light-mode-video.mp4';

  return <SeamlessBackgroundVideo key={theme} src={src} />;
}
