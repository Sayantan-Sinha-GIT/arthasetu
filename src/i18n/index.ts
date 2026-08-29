// ─── ArthaSetu 22 Scheduled Indian Languages + English i18n System ───
import en, { type Translations } from './en';
import hi from './hi';
import bn from './bn';
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode, type LanguageMeta, getLanguageMeta } from './languages';

// Import compiled locale JSONs
import asLocale from './locales/as.json';
import brxLocale from './locales/brx.json';
import doiLocale from './locales/doi.json';
import guLocale from './locales/gu.json';
import knLocale from './locales/kn.json';
import ksLocale from './locales/ks.json';
import kokLocale from './locales/kok.json';
import maiLocale from './locales/mai.json';
import mlLocale from './locales/ml.json';
import mniLocale from './locales/mni.json';
import mrLocale from './locales/mr.json';
import neLocale from './locales/ne.json';
import orLocale from './locales/or.json';
import paLocale from './locales/pa.json';
import saLocale from './locales/sa.json';
import satLocale from './locales/sat.json';
import sdLocale from './locales/sd.json';
import taLocale from './locales/ta.json';
import teLocale from './locales/te.json';
import urLocale from './locales/ur.json';

const translations: Record<string, Translations> = {
  en,
  hi,
  bn,
  as: asLocale as unknown as Translations,
  brx: brxLocale as unknown as Translations,
  doi: doiLocale as unknown as Translations,
  gu: guLocale as unknown as Translations,
  kn: knLocale as unknown as Translations,
  ks: ksLocale as unknown as Translations,
  kok: kokLocale as unknown as Translations,
  mai: maiLocale as unknown as Translations,
  ml: mlLocale as unknown as Translations,
  mni: mniLocale as unknown as Translations,
  mr: mrLocale as unknown as Translations,
  ne: neLocale as unknown as Translations,
  or: orLocale as unknown as Translations,
  pa: paLocale as unknown as Translations,
  sa: saLocale as unknown as Translations,
  sat: satLocale as unknown as Translations,
  sd: sdLocale as unknown as Translations,
  ta: taLocale as unknown as Translations,
  te: teLocale as unknown as Translations,
  ur: urLocale as unknown as Translations,
};

export function getTranslations(language: string): Translations {
  return translations[language] || translations['en'] || en;
}

export function t(language: string, path: string): string {
  const trans = getTranslations(language);
  const keys = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any = trans;
  for (const key of keys) {
    result = result?.[key];
  }
  return typeof result === 'string' ? result : path;
}

export { SUPPORTED_LANGUAGES, getLanguageMeta, en, hi, bn };
export type { Translations, SupportedLanguageCode, LanguageMeta };
