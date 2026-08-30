'use client';

import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';
import SeamlessBackgroundVideo from './SeamlessBackgroundVideo';

export default function PageBackgroundVideo() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const { quality } = useNetworkQuality();

  if (pathname === '/' || quality !== 'full') return null; // homepage keeps its own hero treatment; disabled on reduced/minimal network

  const src = theme === 'dark' ? '/videos/dark-mode-video.mp4' : '/videos/light-mode-video.mp4';

  // Scrim ensures text/cards on top stay readable regardless of video content.
  const overlayClassName = theme === 'dark'
    ? 'bg-background/80'
    : 'bg-background/85';

  return <SeamlessBackgroundVideo key={theme} src={src} overlayClassName={overlayClassName} />;
}
