import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import en from '../src/i18n/en';
import hi from '../src/i18n/hi';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY!;
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
const chunk1: Record<string, string> = {};
const chunk2: Record<string, string> = {};
keysList.slice(0, mid).forEach((k) => (chunk1[k] = flatEn[k]));
keysList.slice(mid).forEach((k) => (chunk2[k] = flatEn[k]));

async function translateMaithili(chunk: any, part: number) {
  const prompt = `You are a native Maithili linguist and translator from Mithila (Bihar).
Translate the following English UI strings into authentic, distinct MAITHILI (मैथिली भाषा) in Devanagari script.

CRITICAL MAITHILI LANGUAGE RULES:
1. Use authentic Maithili grammar, pronouns, verbs, and noun inflections (e.g. use "अहाँ / अहाँक" instead of "आप / आपका", "कैल गेल / करब / देखू" instead of "किया गया / करें", "योजना सभ" instead of "योजनाएं", "कम्म / काज / व्यापार" instead of generic Hindi, "सहेजल" instead of "सहेजा गया", "नीक" instead of "अच्छा").
2. DO NOT use Standard Hindi phrasing. Make the sentences distinctively Maithili.
3. Keep technical acronyms intact: "ArthaSetu", "PMEGP", "MUDRA", "MSME", "KVIC", "DIC", "DPR", "KYC", "PAN", "WhatsApp", "SMS", "₹".
4. Retain all formatting and return JSON with exact keys.

Input JSON Part ${part}:
${JSON.stringify(chunk, null, 2)}
`;
  const res = await model.generateContent(prompt);
  return JSON.parse(res.response.text());
}

async function run() {
  console.log('Generating distinct Maithili translations Part 1...');
  const res1 = await translateMaithili(chunk1, 1);
  console.log('Generating distinct Maithili translations Part 2...');
  const res2 = await translateMaithili(chunk2, 2);

  const mergedFlat: Record<string, string> = {};
  for (const k of keysList) {
    mergedFlat[k] = res1[k] || res2[k] || flatEn[k];
  }

  const unflattened = unflattenObject(mergedFlat);
  const filePath = path.resolve(process.cwd(), 'src/i18n/locales/mai.json');
  fs.writeFileSync(filePath, JSON.stringify(unflattened, null, 2), 'utf-8');
  console.log('✅ Wrote distinct Maithili locale!');
}

run().catch(console.error);
