'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  getTranslations,
  type Translations,
  SUPPORTED_LANGUAGES,
  getLanguageMeta,
  type LanguageMeta,
} from '@/i18n';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: Translations;
  currentMeta: LanguageMeta;
  languages: LanguageMeta[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>('en');

  // Deferred to an effect (rather than a lazy useState initializer) so
  // server and first client render both render in English, avoiding a
  // hydration mismatch across every piece of translated text on the page.
  useEffect(() => {
    const saved = localStorage.getItem('arthasetu-language');
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('arthasetu-language', lang);
  }, []);

  const t = getTranslations(language);
  const currentMeta = getLanguageMeta(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, currentMeta, languages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
