'use client';

import { ReactNode, useEffect } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NetworkQualityProvider, useNetworkQuality } from '@/contexts/NetworkQualityContext';
import { MotionConfig } from 'framer-motion';

function MotionQualityWrapper({ children }: { children: ReactNode }) {
  const { quality } = useNetworkQuality();
  
  useEffect(() => {
    if (quality === 'minimal') {
      document.documentElement.classList.add('data-saver');
    } else {
      document.documentElement.classList.remove('data-saver');
    }
  }, [quality]);

  return (
    <MotionConfig reducedMotion={quality === 'minimal' ? 'always' : 'user'}>
      {children}
    </MotionConfig>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NetworkQualityProvider>
      <MotionQualityWrapper>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </MotionQualityWrapper>
    </NetworkQualityProvider>
  );
}
