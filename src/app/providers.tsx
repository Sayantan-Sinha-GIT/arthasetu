'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NetworkQualityProvider } from '@/contexts/NetworkQualityContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NetworkQualityProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </NetworkQualityProvider>
  );
}
