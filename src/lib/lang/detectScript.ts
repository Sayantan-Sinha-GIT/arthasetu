// src/lib/lang/detectScript.ts
// Cheap, zero-cost Unicode-range based language guess for Indic scripts + English.
// Good enough to route "which language did they actually speak" without an API call.

const SCRIPT_RANGES: { code: string; test: RegExp }[] = [
  { code: 'bn', test: /[\u0980-\u09FF]/ },   // Bengali / Assamese share this block
  { code: 'hi', test: /[\u0900-\u097F]/ },   // Devanagari (Hindi, Marathi, Sanskrit, Maithili...)
  { code: 'gu', test: /[\u0A80-\u0AFF]/ },
  { code: 'pa', test: /[\u0A00-\u0A7F]/ },
  { code: 'or', test: /[\u0B00-\u0B7F]/ },
  { code: 'ta', test: /[\u0B80-\u0BFF]/ },
  { code: 'te', test: /[\u0C00-\u0C7F]/ },
  { code: 'kn', test: /[\u0C80-\u0CFF]/ },
  { code: 'ml', test: /[\u0D00-\u0D7F]/ },
  { code: 'ur', test: /[\u0600-\u06FF]/ },   // also catches Kashmiri/Sindhi Perso-Arabic forms
  { code: 'en', test: /^[\x00-\x7F\s.,!?'"()-]+$/ },
];

export function detectScriptLanguage(text: string): string {
  for (const { code, test } of SCRIPT_RANGES) {
    if (test.test(text)) return code;
  }
  return 'en'; // safe fallback
}
