/**
 * Translates the two new `tts` read-aloud availability strings into all 22
 * scheduled languages. Modelled on scripts/translate-new-keys.ts, but uses the
 * @google/genai SDK the app itself depends on, and knows that hi/bn live in
 * .ts files while the rest are locale JSON.
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

const chunk = {
  tts: {
    voiceUnavailable: en.tts.voiceUnavailable,
  },
};

const languagesMeta = [
  { code: 'hi', name: 'Hindi', script: 'Devanagari' },
  { code: 'as', name: 'Assamese', script: 'Bengali-Assamese script (অসমীয়া)' },
  { code: 'bn', name: 'Bengali', script: 'Bengali script (বাংলা)' },
  { code: 'brx', name: 'Bodo', script: "Devanagari script (बर’/बोडो)" },
  { code: 'doi', name: 'Dogri', script: 'Devanagari script (डोगरी)' },
  { code: 'gu', name: 'Gujarati', script: 'Gujarati script (ગુજરાતી)' },
  { code: 'kn', name: 'Kannada', script: 'Kannada script (ಕನ್ನಡ)' },
  { code: 'ks', name: 'Kashmiri', script: 'Perso-Arabic script (کٲشُر)' },
  { code: 'kok', name: 'Konkani', script: 'Devanagari script (कोंकणी)' },
  { code: 'mai', name: 'Maithili', script: 'Devanagari script (मैथिली)' },
  { code: 'ml', name: 'Malayalam', script: 'Malayalam script (മലയാളം)' },
  { code: 'mni', name: 'Manipuri', script: 'Bengali/Meetei Mayek script (মৈতৈলোন্)' },
  { code: 'mr', name: 'Marathi', script: 'Devanagari script (मराठी)' },
  { code: 'ne', name: 'Nepali', script: 'Devanagari script (नेपाली)' },
  { code: 'or', name: 'Odia', script: 'Odia script (ଓଡ଼ିଆ)' },
  { code: 'pa', name: 'Punjabi', script: 'Gurmukhi script (ਪੰਜਾਬੀ)' },
  { code: 'sa', name: 'Sanskrit', script: 'Devanagari script (संस्कृतम्)' },
  { code: 'sat', name: 'Santali', script: 'Ol Chiki script (ᱥᱟᱱᱛᱟᱲᱤ)' },
  { code: 'sd', name: 'Sindhi', script: 'Perso-Arabic script (سنڌي)' },
  { code: 'ta', name: 'Tamil', script: 'Tamil script (தமிழ்)' },
  { code: 'te', name: 'Telugu', script: 'Telugu script (తెలుగు)' },
  { code: 'ur', name: 'Urdu', script: 'Nastaliq / Urdu Perso-Arabic script (اردو)' },
];

async function translate(lang: { code: string; name: string; script: string }) {
  const prompt = `You are a native professional translator in ${lang.name} (${lang.script}).
Translate these UI strings into authentic ${lang.name} in native ${lang.script}.
Context: they appear on a "read aloud" button when the user's device has no
text-to-speech voice installed for their language.

RULES:
1. Use 100% native ${lang.script}.
3. Every character must be in ${lang.script}. Not one character from any
   other writing system, and no Latin/English letters at all — translate
   loanwords like "voice", "install" and "device" too.
4. Return only JSON with the exact same key structure as the input.

Input JSON:
${JSON.stringify(chunk, null, 2)}`;

  const res = await ai.models.generateContent({
    // Flash-Lite is this project's designated fast-translation model, and
    // keeps the heavier Flash daily quota free for the advisor itself.
    model: 'gemini-3.5-flash-lite',
    contents: prompt,
    config: { responseMimeType: 'application/json', temperature: 0.1 },
  });
  const text = (res.text || '').replace(/^```json\s*/, '').replace(/```\s*$/, '');
  return JSON.parse(text) as { tts: Record<string, string> };
}

function updateJson(code: string, values: Record<string, string>) {
  const file = path.resolve(process.cwd(), `src/i18n/locales/${code}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  data.tts = { ...(data.tts || {}), ...values };
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/** hi.ts / bn.ts are TypeScript modules holding a JSON-shaped object literal. */
function updateTs(code: string, values: Record<string, string>) {
  const file = path.resolve(process.cwd(), `src/i18n/${code}.ts`);
  let src = fs.readFileSync(file, 'utf-8');
  const anchor = '  "tts": {';
  if (!src.includes(anchor)) throw new Error(`no tts block in ${code}.ts`);
  const added = Object.entries(values)
    .map(([k, v]) => `    "${k}": ${JSON.stringify(v)},`)
    .join('\n');
  src = src.replace(anchor, `${anchor}\n${added}`);
  fs.writeFileSync(file, src, 'utf-8');
}

async function run() {
  for (const lang of languagesMeta) {
    try {
      let values: Record<string, string> | undefined;
      // Models drift into the wrong script on the rarer languages, so every
      // result is validated against the target Unicode block and retried if
      // it strays. Without this, sat came back carrying Tibetan glyphs and sd
      // came back with Bengali inside Perso-Arabic.
      for (let attempt = 1; attempt <= 4; attempt++) {
        const out = await translate(lang);
        const candidate = out.tts;
        if (!candidate?.voiceUnavailable) continue;
        const r = checkOne(lang.code, candidate.voiceUnavailable);
        if (!r.foreign.length && r.latin === 0) {
          values = candidate;
          break;
        }
        console.log(`   retry ${lang.code} (${attempt}): foreign=[${r.foreign}] latin=${r.latin}`);
        await new Promise((res) => setTimeout(res, 1500));
      }
      if (!values?.voiceUnavailable) {
        throw new Error('no output passed script validation');
      }
      if (lang.code === 'hi' || lang.code === 'bn') updateTs(lang.code, values);
      else updateJson(lang.code, values);
      console.log(`✅ ${lang.code}: ${values.voiceUnavailable}`);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      console.error(`❌ ${lang.code}:`, err instanceof Error ? err.message : err);
    }
  }
}

run();
