// ─── ArthaSetu i18n Regeneration ───
// Root-cause fix for widespread "language leaks": en.ts has grown to 714 nested
// keys over time, but hi.ts/bn.ts and the 19 machine-translated locale JSONs
// were only ever partially patched, so most non-English/Hindi users were
// silently seeing raw English strings (or, before the index.ts fallback fix,
// hitting hard crashes on the missing keys).
//
// This script re-derives every non-English locale from the current en.ts:
//  - hi.ts / bn.ts (hand-verified): only the keys MISSING vs en.ts are sent to
//    Gemini for translation; every existing hand-verified string is untouched.
//  - the 19 JSON locales (previously mostly English clones from
//    generate-all-locales.ts): fully re-translated from en.ts in one shot each,
//    since most of their existing values were never real translations.
//
// Usage: npx tsx scripts/regenerate-translations.ts [--only=ta,te,...]

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import en from '../src/i18n/en';
import hi from '../src/i18n/hi';
import bn from '../src/i18n/bn';
import { SUPPORTED_LANGUAGES } from '../src/i18n/languages';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

type AnyObj = Record<string, unknown>;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY missing from environment (.env.local)');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });
// Use flash-lite: the flash model's free-tier quota (20 req/day) is shared
// with real users of the live advisor — translation work must not eat that.
const MODEL = 'gemini-3.5-flash-lite';

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const onlyCodes = onlyArg ? new Set(onlyArg.split('=')[1].split(',')) : null;

// ─── Path helpers ───
function getPath(obj: unknown, keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as AnyObj)[k];
  }
  return cur;
}
function setPath(obj: AnyObj, keys: string[], value: unknown) {
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
    cur = cur[k] as AnyObj;
  }
  cur[keys[keys.length - 1]] = value;
}
function collectKeyPaths(obj: unknown, prefix: string[] = []): string[][] {
  let out: string[][] = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const k of Object.keys(obj as AnyObj)) {
      out = out.concat(collectKeyPaths((obj as AnyObj)[k], [...prefix, k]));
    }
  } else {
    out.push(prefix);
  }
  return out;
}
function buildSubset(source: unknown, paths: string[][]): AnyObj {
  const result: AnyObj = {};
  for (const p of paths) setPath(result, p, getPath(source, p));
  return result;
}
function countCoverage(obj: unknown, against: string[][]): number {
  let covered = 0;
  for (const p of against) {
    const v = getPath(obj, p);
    if (typeof v === 'string' && v.trim() !== '') covered++;
  }
  return covered;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateJson(payload: AnyObj, languageName: string, nativeScriptNote: string, attempts = 4): Promise<AnyObj> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await translateJsonOnce(payload, languageName, nativeScriptNote);
    } catch (err) {
      lastErr = err;
      console.warn(`  retrying after malformed output (attempt ${attempt}/${attempts}): ${err instanceof Error ? err.message : err}`);
      await sleep(1500 * attempt);
    }
  }
  throw lastErr;
}

async function translateJsonOnce(payload: AnyObj, languageName: string, nativeScriptNote: string): Promise<AnyObj> {
  const prompt = `You are an expert professional translator specializing in Indian languages for a rural fintech product called ArthaSetu (financial/business advisory for micro-entrepreneurs).

Translate every string value in this JSON object into ${languageName} (${nativeScriptNote}).

STRICT RULES:
1. Return ONLY a valid JSON object with the EXACT same nested key structure as the input — do not add, remove, or rename any key.
2. Translate the STRING VALUES only. Keep JSON keys in English exactly as given.
3. Keep these tokens untouched wherever they appear inside a string: {{placeholders}} like {{days}}, the ₹ symbol, numbers, and proper nouns/acronyms (ArthaSetu, PMEGP, MUDRA, DSCR, PAT, CAPEX, OPEX, EMI, NABARD, SIH, UPI).
4. Preserve markdown formatting like **bold** and \\n line breaks exactly where they appear.
5. Use natural, simple, plain-spoken ${languageName} suitable for a rural micro-entrepreneur with limited formal education — not stiff bureaucratic language.
6. Do not translate empty strings; leave them empty.

Input JSON:
${JSON.stringify(payload, null, 2)}`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: 0.2,
      maxOutputTokens: 32768,
      responseMimeType: 'application/json',
    },
  });

  const text = response.text;
  if (!text) throw new Error('Empty response from Gemini');
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned) as AnyObj;
}

function deepMerge(target: AnyObj, source: AnyObj): AnyObj {
  for (const key of Object.keys(source)) {
    const sv = source[key];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      if (typeof target[key] !== 'object' || target[key] === null) target[key] = {};
      deepMerge(target[key] as AnyObj, sv as AnyObj);
    } else if (typeof sv === 'string' && sv.trim() !== '') {
      target[key] = sv;
    }
  }
  return target;
}

function writeTsLocale(filePath: string, varName: string, headerComment: string, data: AnyObj) {
  const body = JSON.stringify(data, null, 2)
    // JSON.stringify quotes keys; ts objects don't need quotes but valid JS/TS accepts quoted keys fine.
    ;
  const content = `${headerComment}\nimport type { Translations } from './en';\n\nconst ${varName}: Translations = ${body};\n\nexport default ${varName};\n`;
  fs.writeFileSync(filePath, content, 'utf-8');
}

async function run() {
  const enPaths = collectKeyPaths(en);
  console.log(`en.ts has ${enPaths.length} leaf keys total.\n`);

  // ─── Hindi & Bengali: delta-only translation of missing keys ───
  const handVerified: Array<{ code: string; name: string; script: string; obj: AnyObj; varName: string; filePath: string; header: string }> = [
    { code: 'hi', name: 'Hindi', script: 'Devanagari script', obj: hi as unknown as AnyObj, varName: 'hi', filePath: path.resolve(process.cwd(), 'src/i18n/hi.ts'), header: "// ─── Hindi UI Strings (Human Verified) ───" },
    { code: 'bn', name: 'Bengali', script: 'Bengali script', obj: bn as unknown as AnyObj, varName: 'bn', filePath: path.resolve(process.cwd(), 'src/i18n/bn.ts'), header: "// ─── Bengali (বাংলা) UI Strings — Human Verified ───" },
  ];

  for (const lang of handVerified) {
    if (onlyCodes && !onlyCodes.has(lang.code)) continue;
    const missing = enPaths.filter((p) => {
      const v = getPath(lang.obj, p);
      return typeof v !== 'string' || v.trim() === '';
    });
    console.log(`[${lang.code}] missing ${missing.length} / ${enPaths.length} keys`);
    if (missing.length === 0) {
      console.log(`[${lang.code}] already complete, skipping.\n`);
      continue;
    }
    const subset = buildSubset(en, missing);
    const translated = await translateJson(subset, lang.name, lang.script);
    const merged = deepMerge(JSON.parse(JSON.stringify(lang.obj)), translated);
    // Ensure zero remaining gaps by falling back to English for anything still missing
    for (const p of missing) {
      const v = getPath(merged, p);
      if (typeof v !== 'string' || v.trim() === '') setPath(merged, p, getPath(en, p));
    }
    const coverage = countCoverage(merged, enPaths);
    console.log(`[${lang.code}] coverage after merge: ${coverage}/${enPaths.length}`);
    writeTsLocale(lang.filePath, lang.varName, lang.header, merged);
    console.log(`[${lang.code}] ✅ wrote ${lang.filePath}\n`);
  }

  // ─── The 19 machine-translated locales: full regeneration in one shot each ───
  const scriptNotes: Record<string, string> = {
    as: 'Assamese script', brx: 'Devanagari script', doi: 'Devanagari script', gu: 'Gujarati script',
    kn: 'Kannada script', ks: 'Perso-Arabic or Devanagari script, whichever is more commonly read',
    kok: 'Devanagari script', mai: 'Devanagari script', ml: 'Malayalam script', mni: 'Bengali/Meetei script',
    mr: 'Devanagari script', ne: 'Devanagari script', or: 'Odia script', pa: 'Gurmukhi script',
    sa: 'Devanagari script', sat: 'Ol Chiki script (or Devanagari if Ol Chiki is impractical)',
    sd: 'Perso-Arabic script', ta: 'Tamil script', te: 'Telugu script', ur: 'Perso-Arabic Nastaliq script',
  };

  const jsonLocales = SUPPORTED_LANGUAGES.filter((l) => !['en', 'hi', 'bn'].includes(l.code));

  for (const lang of jsonLocales) {
    if (onlyCodes && !onlyCodes.has(lang.code)) continue;
    const filePath = path.resolve(process.cwd(), `src/i18n/locales/${lang.code}.json`);
    const existing: AnyObj = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : {};
    const missing = enPaths.filter((p) => {
      const v = getPath(existing, p);
      return typeof v !== 'string' || v.trim() === '';
    });
    const script = scriptNotes[lang.code] || 'its standard native script';

    try {
      let merged: AnyObj;
      if (missing.length > 0 && missing.length < enPaths.length * 0.5) {
        // Locale is already mostly complete — only translate the delta. Cheaper
        // and far less prone to the stray-script glitch than a full re-shot.
        console.log(`[${lang.code}] delta-filling ${missing.length} new/missing keys (${lang.name})...`);
        const subset = buildSubset(en, missing);
        const translated = await translateJson(subset, lang.name, script);
        merged = deepMerge(JSON.parse(JSON.stringify(existing)), translated);
      } else if (missing.length === 0) {
        console.log(`[${lang.code}] already complete, skipping.\n`);
        continue;
      } else {
        console.log(`[${lang.code}] translating full locale (${lang.name})...`);
        const translated = await translateJson(en as unknown as AnyObj, lang.name, script);
        merged = {};
        deepMerge(merged, translated);
      }
      // Fill any remaining gap with English so nothing is ever undefined.
      for (const p of enPaths) {
        const v = getPath(merged, p);
        if (typeof v !== 'string' || v.trim() === '') setPath(merged, p, getPath(en, p));
      }
      const coverage = countCoverage(merged, enPaths);
      console.log(`[${lang.code}] final coverage (with EN fill): ${coverage}/${enPaths.length}`);

      const finalObj = { ...merged, _meta: { languageCode: lang.code, languageName: lang.name, nativeName: lang.nativeName, isMachineTranslated: true, status: 'machine_translated' } };
      fs.writeFileSync(filePath, JSON.stringify(finalObj, null, 2), 'utf-8');
      console.log(`[${lang.code}] ✅ wrote ${filePath}\n`);
    } catch (err) {
      console.error(`[${lang.code}] ❌ FAILED:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('Done.');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
