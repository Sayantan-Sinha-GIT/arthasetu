import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import en from '../src/i18n/en';
import { SUPPORTED_LANGUAGES } from '../src/i18n/languages';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.5-flash-lite',
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
  },
});

const EXEMPT_PATTERNS = [
  /^ArthaSetu$/, /^₹$/, /^AI$/, /^PDF$/, /^PMEGP$/, /^MUDRA$/, /^KVIC$/, /^DIC$/, /^MSME$/,
  /^DPR$/, /^KYC$/, /^PAN$/, /^URL$/, /^PAT$/, /^EMI$/, /^DSCR$/, /^SHG$/, /^WhatsApp$/,
  /^SMS$/, /^0$/, /^1$/, /^2$/, /^3$/, /^4$/, /^5$/, /^300$/, /^900$/, /^4632$/,
  /^[\d\s,.\-%+/():•✓⚠️🚀🏛️📊🎙️📋💡📂⏳⚖️🌾🪪🏢👥🎛️🔔🔕🔒🛡️📜✨]*$/,
];

function isExempt(val: string): boolean {
  if (!val || typeof val !== 'string') return true;
  const trimmed = val.trim();
  if (trimmed.length === 0) return true;
  return EXEMPT_PATTERNS.some((pat) => pat.test(trimmed));
}

function isLikelyEnglish(str: string, langCode: string): boolean {
  if (isExempt(str)) return false;
  if (langCode === 'en') return false;
  const lettersOnly = str.replace(/[\d\s\p{P}\p{S}]/gu, '');
  if (lettersOnly.length === 0) return false;
  const latinMatches = lettersOnly.match(/[A-Za-z]/g) || [];
  return (latinMatches.length / lettersOnly.length) > 0.5;
}

function flattenObject(ob: any, prefix = ''): Record<string, string> {
  const toReturn: Record<string, string> = {};
  for (const i in ob) {
    if (!Object.prototype.hasOwnProperty.call(ob, i)) continue;
    if (typeof ob[i] === 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
      const flatObject = flattenObject(ob[i], prefix + i + '.');
      for (const x in flatObject) {
        if (!Object.prototype.hasOwnProperty.call(flatObject, x)) continue;
        toReturn[x] = flatObject[x];
      }
    } else {
      toReturn[prefix + i] = String(ob[i]);
    }
  }
  return toReturn;
}

function unflattenObject(data: Record<string, any>): any {
  const result: any = {};
  for (const i in data) {
    const keys = i.split('.');
    keys.reduce((r, a, j) => {
      return (
        r[a] ||
        (r[a] = isNaN(Number(keys[j + 1]))
          ? keys.length - 1 === j
            ? data[i]
            : {}
          : [])
      );
    }, result);
  }
  return result;
}

const flatEn = flattenObject(en);

async function translateSpecificKeys(
  keysToTranslate: Record<string, string>,
  langCode: string,
  langName: string,
  nativeName: string,
  scriptInstruction: string
): Promise<Record<string, string>> {
  const prompt = `You are a native translator for the Indian official language "${langName}" (${nativeName}).
Translate the following English strings into pure, genuine ${langName} using ${scriptInstruction}.

STRICT RULES:
1. Use ONLY the authentic native script: ${scriptInstruction}.
2. DO NOT use Roman/Latin transliteration (e.g. write in Devanagari script or the appropriate Indian script, NOT English letters).
3. Keep technical terms intact: "ArthaSetu", "PMEGP", "MUDRA", "₹", "MSME", "PDF", "AI", "KYC", "PAN", "WhatsApp", "SMS", "DIC", "KVIC", "DPR".
4. Retain all punctuation and emojis cleanly.
5. Return JSON with the exact same keys.

Input JSON:
${JSON.stringify(keysToTranslate, null, 2)}
`;

  let attempts = 0;
  while (attempts < 3) {
    try {
      const res = await model.generateContent(prompt);
      return JSON.parse(res.response.text());
    } catch (err) {
      attempts++;
      await new Promise((r) => setTimeout(r, 1500 * attempts));
    }
  }
  return keysToTranslate;
}

const NATIVE_SCRIPTS: Record<string, string> = {
  brx: 'Devanagari script (बड़ो राव) - genuine Bodo language in Devanagari script, absolutely NO Latin/English letters',
  doi: 'Devanagari script (डोगरी) - genuine Dogri language in Devanagari script, absolutely NO Latin/English letters',
  gu: 'Gujarati script (ગુજરાતી)',
  kn: 'Kannada script (ಕನ್ನಡ)',
  ks: 'Devanagari script (कॉशुर)',
  kok: 'Devanagari script (कोंकणी)',
  mai: 'Devanagari script (मैथिली)',
  ml: 'Malayalam script (മലയാളം)',
  mni: 'Bengali/Meetei script (মৈতৈলোন্)',
  mr: 'Marathi script (मराठी)',
  ne: 'Devanagari script (नेपाली)',
  or: 'Odia script (ଓଡ଼ିଆ)',
  pa: 'Gurmukhi script (ਪੰਜਾਬੀ)',
  sa: 'Devanagari script (संस्कृतम्)',
  sat: 'Ol Chiki or Devanagari script (ᱥᱟᱱᱛᱟᱲᱤ)',
  sd: 'Sindhi script or Devanagari (सिन्धी)',
  ta: 'Tamil script (தமிழ்)',
  te: 'Telugu script (తెలుగు)',
  ur: 'Perso-Arabic script (اردو)',
  hi: 'Devanagari script (हिन्दी)',
  bn: 'Bengali script (বাংলা)',
  as: 'Assamese script (অসমীয়া)',
};

async function fixAllLeaks() {
  console.log('Detecting and fixing leaks across all 22 locales...');

  const allCodes = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code);

  for (const code of allCodes) {
    const meta = SUPPORTED_LANGUAGES.find((l) => l.code === code)!;
    const jsonPath = path.resolve(process.cwd(), `src/i18n/locales/${code}.json`);
    let currentDict: Record<string, string> = {};

    if (fs.existsSync(jsonPath)) {
      currentDict = flattenObject(JSON.parse(fs.readFileSync(jsonPath, 'utf-8')));
    }

    const leakedKeys: Record<string, string> = {};
    for (const k of Object.keys(flatEn)) {
      const val = currentDict[k] || '';
      if (!val || val === flatEn[k] || isLikelyEnglish(val, code)) {
        if (!isExempt(flatEn[k])) {
          leakedKeys[k] = flatEn[k];
        }
      }
    }

    const leakCount = Object.keys(leakedKeys).length;
    if (leakCount > 0) {
      console.log(`Fixing ${leakCount} keys in ${code} (${meta.name})...`);
      const scriptInstr = NATIVE_SCRIPTS[code] || `${meta.name} native script`;

      // Split into batches of max 30 keys
      const keysArr = Object.keys(leakedKeys);
      const batchSize = 30;
      for (let i = 0; i < keysArr.length; i += batchSize) {
        const batchKeys = keysArr.slice(i, i + batchSize);
        const subChunk: Record<string, string> = {};
        batchKeys.forEach((k) => (subChunk[k] = leakedKeys[k]));

        console.log(`  -> Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(keysArr.length / batchSize)} (${batchKeys.length} keys)...`);
        const fixed = await translateSpecificKeys(subChunk, code, meta.name, meta.nativeName, scriptInstr);

        for (const k of Object.keys(fixed)) {
          currentDict[k] = fixed[k];
        }
      }

      const unflattened = unflattenObject(currentDict);
      fs.writeFileSync(jsonPath, JSON.stringify(unflattened, null, 2), 'utf-8');
      console.log(`  ✅ Fixed & saved ${jsonPath}`);
    } else {
      console.log(`  ✨ ${code} (${meta.name}): 0 leaks.`);
    }
  }

  console.log('\nAll locale fix iterations complete!');
}

fixAllLeaks();
