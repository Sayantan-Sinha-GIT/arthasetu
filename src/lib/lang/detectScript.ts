// src/lib/lang/detectScript.ts
// Cheap, zero-cost Unicode-range based language guess for Indic scripts + English.
// Good enough to route "which language did they actually speak" without an API call.

const SCRIPT_RANGES: { code: string; test: RegExp }[] = [
  { code: 'bn', test: /[ঀ-৿]/ },   // Bengali / Assamese share this block
  { code: 'hi', test: /[ऀ-ॿ]/ },   // Devanagari (Hindi, Marathi, Sanskrit, Maithili...)
  { code: 'gu', test: /[઀-૿]/ },
  { code: 'pa', test: /[਀-੿]/ },
  { code: 'or', test: /[଀-୿]/ },
  { code: 'ta', test: /[஀-௿]/ },
  { code: 'te', test: /[ఀ-౿]/ },
  { code: 'kn', test: /[ಀ-೿]/ },
  { code: 'ml', test: /[ഀ-ൿ]/ },
  { code: 'ur', test: /[؀-ۿ]/ },   // also catches Kashmiri/Sindhi Perso-Arabic forms
  { code: 'mni', test: /[ꯀ-꯿]/ },  // Meetei Mayek
  { code: 'sat', test: /[᱐-᱿]/ },  // Santali (Ol Chiki)
  { code: 'en', test: /^[\x00-\x7F\s.,!?'"()-]+$/ },
];

export function detectScriptLanguage(text: string): string {
  for (const { code, test } of SCRIPT_RANGES) {
    if (test.test(text)) return code;
  }
  return 'en'; // safe fallback
}

/** Languages written in the same script cannot be told apart by script alone. */
const SCRIPT_OF: Record<string, string> = {
  hi: 'deva', mr: 'deva', mai: 'deva', ne: 'deva', sa: 'deva', doi: 'deva', kok: 'deva', brx: 'deva',
  bn: 'beng', as: 'beng',
  ur: 'arab', ks: 'arab', sd: 'arab',
};

/**
 * The language the advisor should answer in.
 *
 * The chat used to send only the script of the message, which failed the people
 * the app is for. A Marathi user typing Marathi was answered in Hindi, since
 * Devanagari reads as Hindi; an Assamese user was answered in Bengali. And
 * anyone typing their own language in Roman letters — "mujhe dukan ke liye loan
 * chahiye" — was answered in English, which they may not read at all. Now the
 * language they chose for the app wins unless the message is plainly written in
 * a different script.
 */
export function resolveReplyLanguage(text: string, appLanguage = 'en'): string {
  const detected = detectScriptLanguage(text);
  const written = SCRIPT_RANGES.some(({ code, test }) => code !== 'en' && test.test(text));
  if (!written) return appLanguage;
  const scriptOf = (code: string) => SCRIPT_OF[code] || code;
  return scriptOf(detected) === scriptOf(appLanguage) ? appLanguage : detected;
}
