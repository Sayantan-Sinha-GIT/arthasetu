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

const rawTranslations: Record<string, unknown> = {
  en,
  hi,
  bn,
  as: asLocale,
  brx: brxLocale,
  doi: doiLocale,
  gu: guLocale,
  kn: knLocale,
  ks: ksLocale,
  kok: kokLocale,
  mai: maiLocale,
  ml: mlLocale,
  mni: mniLocale,
  mr: mrLocale,
  ne: neLocale,
  or: orLocale,
  pa: paLocale,
  sa: saLocale,
  sat: satLocale,
  sd: sdLocale,
  ta: taLocale,
  te: teLocale,
  ur: urLocale,
};

// Recursively fills any key missing from a locale with the English value for
// that key. Locale files (especially the machine-generated JSON ones) do not
// always have 100% key parity with `en.ts` — without this fallback, a missing
// key resolves to `undefined` and any code that calls a string method on it
// (e.g. `.replace(...)`) throws and crashes the whole page render.
function withEnglishFallback<T>(base: T, override: unknown): T {
  if (base === null || typeof base !== 'object' || Array.isArray(base)) {
    // Scalars/arrays: prefer the translated value, fall back to English.
    return (override === undefined || override === null ? base : (override as T));
  }
  const result: Record<string, unknown> = {};
  const baseObj = base as Record<string, unknown>;
  const overrideObj = (override && typeof override === 'object' ? override : {}) as Record<string, unknown>;
  for (const key of Object.keys(baseObj)) {
    result[key] = withEnglishFallback(baseObj[key], overrideObj[key]);
  }
  return result as T;
}

const translations: Record<string, Translations> = Object.fromEntries(
  Object.entries(rawTranslations).map(([code, value]) => [
    code,
    code === 'en' ? en : withEnglishFallback(en, value),
  ])
) as Record<string, Translations>;

export function getTranslations(language: string): Translations {
  return translations[language] || translations['en'] || en;
}

export function t(language: string, path: string): string {
  const trans = getTranslations(language);
  const keys = path.split('.');
  // Traverses arbitrary nested translation object paths at runtime safely
  let result: unknown = trans;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in (result as Record<string, unknown>)) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof result === 'string' ? result : path;
}

export { SUPPORTED_LANGUAGES, getLanguageMeta, en, hi, bn };
export type { Translations, SupportedLanguageCode, LanguageMeta };
