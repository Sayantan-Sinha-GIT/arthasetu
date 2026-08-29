import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import en from '../src/i18n/en';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.6-flash',
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
  },
});

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
const keysList = Object.keys(flatEn);
const mid = Math.ceil(keysList.length / 2);
const chunk1Keys = keysList.slice(0, mid);
const chunk2Keys = keysList.slice(mid);

const chunk1: Record<string, string> = {};
chunk1Keys.forEach((k) => (chunk1[k] = flatEn[k]));

const chunk2: Record<string, string> = {};
chunk2Keys.forEach((k) => (chunk2[k] = flatEn[k]));

async function translateChunk(chunk: Record<string, string>, partNum: number): Promise<Record<string, string>> {
  const prompt = `You are an expert native translator for Dogri (डोगरी भाषा), spoken in Jammu & Kashmir and Himachal Pradesh.
Translate the following English UI strings into authentic Dogri in the DEVANAGARI SCRIPT (देवनागरी लिपि).

STRICT REQUIREMENTS:
1. Use 100% Devanagari script for Dogri words (e.g. कम्म-कार, मदद, सलाह, आह्दे, तुंदा, साढ़ा, व्यापार, योजना, बचत, इत्यादि).
2. DO NOT use English letters / Roman transliteration for Dogri words.
3. Keep technical acronyms intact: "ArthaSetu", "PMEGP", "MUDRA", "MSME", "KVIC", "DIC", "DPR", "KYC", "PAN", "WhatsApp", "SMS", "GST", "₹".
4. Retain all punctuation, emojis, and placeholders cleanly.
5. Return a JSON object with the exact same keys.

Input JSON Part ${partNum}:
${JSON.stringify(chunk, null, 2)}
`;

  const res = await model.generateContent(prompt);
  return JSON.parse(res.response.text());
}

async function run() {
  console.log('Translating Dogri (doi) Part 1 with gemini-3.6-flash...');
  const res1 = await translateChunk(chunk1, 1);
  console.log('Translating Dogri (doi) Part 2 with gemini-3.6-flash...');
  const res2 = await translateChunk(chunk2, 2);

  const mergedFlat: Record<string, string> = {};
  for (const k of keysList) {
    mergedFlat[k] = res1[k] || res2[k] || flatEn[k];
  }

  const unflattened = unflattenObject(mergedFlat);
  const filePath = path.resolve(process.cwd(), 'src/i18n/locales/doi.json');
  fs.writeFileSync(filePath, JSON.stringify(unflattened, null, 2), 'utf-8');
  console.log(`✅ Successfully wrote ${filePath} (325 keys) in authentic Devanagari Dogri!`);
}

run().catch(console.error);
