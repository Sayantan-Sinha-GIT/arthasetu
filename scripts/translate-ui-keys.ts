/**
 * Translates a set of new English UI strings into all 22 scheduled languages,
 * validating every result against the target script before writing it.
 *
 * Generalises scripts/translate-tts-voice-keys.ts, which only handled one flat
 * key. Edit CHUNK below to whatever needs translating, then:
 *
 *   npx tsx scripts/translate-ui-keys.ts
 *
 * Uses Flash-Lite: the project's designated fast-translation model, which also
 * leaves the scarcer Flash daily quota for the advisor itself.
 */
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI } from '@google/genai';
import en from '../src/i18n/en';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { checkOne } = require('./locale-script-purity.cjs');

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const match = envContent.match(/GEMINI_API_KEY\s*=\s*([^\s\r\n]+)/);
const apiKey = (match ? match[1].replace(/["']/g, '') : process.env.GEMINI_API_KEY) || '';
if (!apiKey) {
  console.error('GEMINI_API_KEY missing');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

/** The strings to translate, shaped exactly as they sit in the locale files. */
const CHUNK = {
  planner: {
    whatif: {
      marginalStatus: en.planner.whatif.marginalStatus,
      atRiskStatus: en.planner.whatif.atRiskStatus,
    },
    pdfCapexTitle: en.planner.pdfCapexTitle,
  },
};

const languagesMeta = [
  { code: 'hi', name: 'Hindi', script: 'Devanagari' },
  { code: 'as', name: 'Assamese', script: 'Assamese/Bengali script (অসমীয়া)' },
  { code: 'bn', name: 'Bengali', script: 'Bengali script (বাংলা)' },
  { code: 'brx', name: 'Bodo', script: 'Devanagari script (बर’/बोडो)' },
  { code: 'doi', name: 'Dogri', script: 'Devanagari script (डोगरी)' },
  { code: 'gu', name: 'Gujarati', script: 'Gujarati script (ગુજરાતી)' },
  { code: 'kn', name: 'Kannada', script: 'Kannada script (ಕನ್ನಡ)' },
  { code: 'ks', name: 'Kashmiri', script: 'Perso-Arabic Kashmiri script (کٲشُر)' },
  { code: 'kok', name: 'Konkani', script: 'Devanagari script (कोंकणी)' },
  { code: 'mai', name: 'Maithili', script: 'Devanagari script (मैथिली)' },
  { code: 'ml', name: 'Malayalam', script: 'Malayalam script (മലയാളം)' },
  { code: 'mni', name: 'Manipuri', script: 'Bengali script (মৈতৈলোন্)' },
  { code: 'mr', name: 'Marathi', script: 'Devanagari script (मराठी)' },
  { code: 'ne', name: 'Nepali', script: 'Devanagari script (नेपाली)' },
  { code: 'or', name: 'Odia', script: 'Odia script (ଓଡ଼ିଆ)' },
  { code: 'pa', name: 'Punjabi', script: 'Gurmukhi script (ਪੰਜਾਬੀ)' },
  { code: 'sa', name: 'Sanskrit', script: 'Devanagari script (संस्कृतम्)' },
  { code: 'sat', name: 'Santali', script: 'Ol Chiki script (ᱥᱟᱱᱛᱟᱲᱤ)' },
  { code: 'sd', name: 'Sindhi', script: 'Perso-Arabic Sindhi script (سنڌي)' },
  { code: 'ta', name: 'Tamil', script: 'Tamil script (தமிழ்)' },
  { code: 'te', name: 'Telugu', script: 'Telugu script (తెలుగు)' },
  { code: 'ur', name: 'Urdu', script: 'Nastaliq / Urdu Perso-Arabic script (اردو)' },
];

type Nested = { [k: string]: string | Nested };

function flatten(obj: Nested, prefix = ''): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.push([key, v]);
    else out.push(...flatten(v, key));
  }
  return out;
}

function setDeep(target: Record<string, unknown>, dotted: string, value: string) {
  const parts = dotted.split('.');
  let node = target;
  for (const part of parts.slice(0, -1)) {
    if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
    node = node[part] as Record<string, unknown>;
  }
  node[parts[parts.length - 1]] = value;
}

async function translate(lang: { code: string; name: string; script: string }) {
  const prompt = `You are a native professional translator in ${lang.name} (${lang.script}).
Translate these UI strings for a financial advisory app used by Indian rural micro-entrepreneurs.

RULES:
1. Every character must be in ${lang.script}. Not one character from any other
   writing system, and no Latin/English words.
2. TRANSLATE the meaning. Do NOT transliterate — writing the English words in
   ${lang.script} letters is wrong. "Total Project Capital Outlay" must use
   real ${lang.name} vocabulary for total / project / capital / expenditure,
   not the English words spelled phonetically.
3. KEEP these exactly as they are, in Roman script: the acronym "DSCR", any
   numbers, and ratio suffixes such as "1.5x". Keep the leading section number
   "2." in Western digits exactly where it is.
4. "Marginal" and "At Risk" are loan-safety verdicts a bank would use about
   repayment capacity. "Total Project Capital Outlay" is a section heading in
   a bank project report, meaning the total up-front capital the project needs.
5. Return ONLY JSON with exactly the same key structure as the input.

Input JSON:
${JSON.stringify(CHUNK, null, 2)}`;

  const res = await ai.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: prompt,
    config: { responseMimeType: 'application/json', temperature: 0.1 },
  });
  return JSON.parse((res.text || '').replace(/^```json\s*/, '').replace(/```\s*$/, '')) as Nested;
}

function applyToLocale(code: string, pairs: [string, string][]) {
  if (code === 'hi' || code === 'bn') {
    const file = `src/i18n/${code}.ts`;
    let src = fs.readFileSync(file, 'utf8');
    for (const [dotted, value] of pairs) {
      const leaf = dotted.split('.').pop()!;
      const parent = dotted.split('.').slice(-2, -1)[0];
      // Insert the leaf directly after its sibling block opens.
      const existing = new RegExp(`"${leaf}"\\s*:\\s*"(?:[^"\\\\]|\\\\.)*"`);
      if (existing.test(src)) {
        // Overwrite rather than skip: a re-run is how a poor translation gets
        // replaced, so leaving the old value in place would defeat the point.
        src = src.replace(existing, `"${leaf}": ${JSON.stringify(value)}`);
        continue;
      }
      const anchor = new RegExp(`("${parent}"\\s*:\\s*\\{)`);
      if (!anchor.test(src)) {
        console.warn(`   ! ${code}: no anchor for ${dotted}`);
        continue;
      }
      src = src.replace(anchor, `$1\n    "${leaf}": ${JSON.stringify(value)},`);
    }
    fs.writeFileSync(file, src, 'utf8');
    return;
  }
  const file = `src/i18n/locales/${code}.json`;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [dotted, value] of pairs) setDeep(data, dotted, value);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

(async () => {
  const expected = flatten(CHUNK).map(([k]) => k);
  for (const lang of languagesMeta) {
    let accepted: [string, string][] | null = null;
    for (let attempt = 1; attempt <= 4 && !accepted; attempt++) {
      try {
        const out = await translate(lang);
        const pairs = flatten(out);
        const keysOk = expected.every((k) => pairs.some(([pk]) => pk === k));
        if (!keysOk) {
          console.log(`   retry ${lang.code} (${attempt}): key structure mismatch`);
        } else {
          const bad = pairs
            .map(([k, v]) => [k, checkOne(lang.code, v)] as const)
            .filter(([, r]) => r.foreign.length || r.latin > 0);
          if (bad.length === 0) accepted = pairs;
          else console.log(`   retry ${lang.code} (${attempt}): ${bad.map(([k, r]) => `${k} foreign=[${r.foreign}] latin=${r.latin}`).join('; ')}`);
        }
      } catch (err) {
        console.log(`   retry ${lang.code} (${attempt}): ${err instanceof Error ? err.message.slice(0, 70) : err}`);
      }
      if (!accepted) await new Promise((r) => setTimeout(r, 1500));
    }
    if (!accepted) {
      console.error(`FAIL ${lang.code}: no clean translation after 4 attempts`);
      continue;
    }
    applyToLocale(lang.code, accepted);
    console.log(`OK   ${lang.code}: ${accepted.map(([, v]) => v).join(' | ')}`);
    await new Promise((r) => setTimeout(r, 1200));
  }
})();
