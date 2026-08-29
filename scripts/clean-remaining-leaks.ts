import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import en from '../src/i18n/en';
import { SUPPORTED_LANGUAGES } from '../src/i18n/languages';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.6-flash',
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 4096,
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

async function run() {
  const allCodes = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code);

  for (const code of allCodes) {
    const meta = SUPPORTED_LANGUAGES.find((l) => l.code === code)!;
    const jsonPath = path.resolve(process.cwd(), `src/i18n/locales/${code}.json`);
    if (!fs.existsSync(jsonPath)) continue;

    const currentDict = flattenObject(JSON.parse(fs.readFileSync(jsonPath, 'utf-8')));
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
      console.log(`Language ${code} (${meta.name}) has ${leakCount} keys to fix:`, Object.keys(leakedKeys));

      const prompt = `Translate these specific English UI strings into "${meta.name}" (${meta.nativeName}).
Use ONLY the authentic native script for ${meta.name} (no English/Latin letters unless they are exempt brand names like ArthaSetu, PMEGP, MUDRA).
Return a JSON object with the exact same keys.

Input JSON:
${JSON.stringify(leakedKeys, null, 2)}
`;

      try {
        const res = await model.generateContent(prompt);
        const fixed = JSON.parse(res.response.text());
        for (const k of Object.keys(fixed)) {
          currentDict[k] = fixed[k];
        }
        const unflattened = unflattenObject(currentDict);
        fs.writeFileSync(jsonPath, JSON.stringify(unflattened, null, 2), 'utf-8');
        console.log(`  ✅ Fixed & saved ${jsonPath}`);
      } catch (err) {
        console.error(`  ❌ Error fixing ${code}:`, err);
      }
    }
  }

  console.log('Finished targeted cleaning.');
}

run().catch(console.error);
