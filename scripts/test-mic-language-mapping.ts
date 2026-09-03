/**
 * Asserts that dictation follows the language the site is displayed in.
 *
 * Regression guard: the microphone announced "(BN-IN)" on a Hindi interface.
 * The speech language was React state seeded from a localStorage preference
 * and only re-synced with the UI `if` no saved value existed. The writer for
 * that key belonged to a voice-language picker deleted in af1f337 as dead
 * code, but its readers survived — so a stale value from a removed feature
 * permanently overrode the UI language, with nothing left that could change
 * it. It is now derived, with no persistence involved.
 *
 *   npx tsx scripts/test-mic-language-mapping.ts
 */
import * as fs from 'fs';
import { SUPPORTED_LANGUAGES, getLanguageMeta } from '../src/i18n/languages';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`);
}

console.log('— every UI language maps to its own speech locale —');

const seen = new Map<string, string>();
for (const lang of SUPPORTED_LANGUAGES) {
  const meta = getLanguageMeta(lang.code);
  const code = meta.speechCode;
  const wellFormed = /^[a-z]{2,3}-[A-Z]{2}$/.test(code);
  if (!wellFormed) {
    check(`${lang.code} -> ${code}`, false, 'not a BCP-47 language-REGION tag');
    continue;
  }
  // The primary subtag must be the language itself, so selecting Hindi cannot
  // yield a Bengali locale.
  const primary = code.split('-')[0];
  check(`${lang.code.padEnd(4)} -> ${code}`, primary === lang.code,
    `primary subtag "${primary}" does not match the UI language "${lang.code}"`);
  const prior = seen.get(code);
  if (prior) {
    check(`${code} is unique`, false, `also used by "${prior}"`);
  }
  seen.set(code, lang.code);
}

console.log('\n— the reported case —');
check('Hindi selected yields hi-IN, not bn-IN', getLanguageMeta('hi').speechCode === 'hi-IN',
  `got ${getLanguageMeta('hi').speechCode}`);
check('Bengali still yields bn-IN', getLanguageMeta('bn').speechCode === 'bn-IN');
check('Tamil yields ta-IN', getLanguageMeta('ta').speechCode === 'ta-IN');

console.log('\n— the component derives rather than persists —');
const chat = fs.readFileSync('src/components/advisor/ChatInterface.tsx', 'utf8');

check('speech language is derived from the UI meta',
  /const speechLanguage = currentMeta\?\.speechCode/.test(chat));
check('no saved speech preference is read back',
  !/localStorage\.getItem\(\s*['"`]?arthasetu-speech-language/.test(chat) &&
  !/localStorage\.getItem\(SPEECH_LANG_KEY/.test(chat),
  'a stale stored value could override the UI language again');
check('the orphaned key is cleared',
  /removeItem\('arthasetu-speech-language'\)/.test(chat));
check('the microphone is started with that derived value',
  /startListening\(speechLanguage\)/.test(chat));

console.log(`\n${failed === 0 ? 'All microphone language assertions passed.' : `${failed} assertion(s) FAILED.`}`);
process.exit(failed === 0 ? 0 : 1);
