import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import en from '../src/i18n/en';
import { SUPPORTED_LANGUAGES } from '../src/i18n/languages';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set in .env.local');
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

// Helper to flatten and unflatten JSON to ensure 100% key fidelity
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
const totalKeys = Object.keys(flatEn).length;
console.log(`Total flat keys to translate per locale: ${totalKeys}`);

// Chunk into 2 parts per language to guarantee fast, zero-truncation generation
const keysList = Object.keys(flatEn);
const mid = Math.ceil(keysList.length / 2);
const chunk1Keys = keysList.slice(0, mid);
const chunk2Keys = keysList.slice(mid);

const chunk1: Record<string, string> = {};
chunk1Keys.forEach((k) => (chunk1[k] = flatEn[k]));

const chunk2: Record<string, string> = {};
chunk2Keys.forEach((k) => (chunk2[k] = flatEn[k]));

async function translateChunk(
  chunk: Record<string, string>,
  langCode: string,
  langName: string,
  nativeName: string,
  scriptGuidance: string
): Promise<Record<string, string>> {
  const prompt = `You are an expert native translator specialized in Indian official languages, rural business terminology, banking, government micro-finance, and UI localization.
Translate the following key-value pairs of English UI strings into "${langName}" (${nativeName}).

CRITICAL REQUIREMENTS:
1. Translate into genuine, authentic ${langName} using the appropriate script: ${scriptGuidance}.
2. Do NOT copy from Hindi or Bengali unless that is genuinely standard for ${langName}.
3. Keep technical acronyms and brands intact: "ArthaSetu", "PMEGP", "MUDRA", "MSME", "KVIC", "DIC", "DPR", "KYC", "PAN", "WhatsApp", "SMS", "GST", "₹".
4. Retain all punctuation, emojis, bullet points, and formatting cleanly.
5. Return a JSON object with the exact same keys, where values are translated into ${langName}.

Input JSON:
${JSON.stringify(chunk, null, 2)}
`;

  let attempts = 0;
  while (attempts < 3) {
    try {
      const res = await model.generateContent(prompt);
      const text = res.response.text();
      const parsed = JSON.parse(text);
      return parsed;
    } catch (err) {
      attempts++;
      console.warn(`Attempt ${attempts} failed for ${langCode}:`, err);
      await new Promise((r) => setTimeout(r, 2000 * attempts));
    }
  }
  throw new Error(`Failed to translate chunk for ${langCode} after 3 attempts`);
}

const SCRIPT_GUIDELINES: Record<string, string> = {
  as: 'Assamese script (অসমীয়া লিপি) - distinctly Assamese vocabulary (e.g. ব্যৱসায়, সাহায্য, পৰিকল্পনা, ইত্যাদি), not Bengali.',
  brx: 'Bodo in Devanagari script (बड़ो राव) - genuine Bodo language vocabulary, distinct from Hindi.',
  doi: 'Dogri in Devanagari script (डोगरी) - genuine Dogri language vocabulary and grammar (e.g. कम्म-कार, मदद, सलाह, इत्यादि), distinct from Standard Hindi.',
  gu: 'Gujarati script (ગુજરાતી લিপি) - authentic Gujarati vocabulary (e.g. વ્યવસાય, યોજનાઓ, ખાતું, નાણાકીય આયોજન).',
  kn: 'Kannada script (ಕನ್ನಡ ಲಿಪಿ) - authentic Kannada vocabulary (e.g. ವ್ಯವಹಾರ, ಯೋಜನೆಗಳು, ಹಣಕಾಸು ಯೋಜನೆ, ಗ್ರಾಮೀಣ).',
  ks: 'Kashmiri in Devanagari/Perso-Arabic script (कॉशुर) - authentic Kashmiri vocabulary and grammar, distinct from Urdu/Hindi.',
  kok: 'Konkani in Devanagari script (कोंकणी) - authentic Goan/Maharashtrian Konkani vocabulary (e.g. वेवसाय, येवजण, येणावळ, अर्थीक), distinct from Marathi/Hindi.',
  mai: 'Maithili in Devanagari script (मैथिली) - authentic Maithili vocabulary and verb conjugations (e.g. व्यापार, योजना, सलाह, अहाँक), distinct from Hindi.',
  ml: 'Malayalam script (മലയാളം ലിപി) - authentic Malayalam vocabulary (e.g. ബിസിനസ്സ്, പദ്ധതികൾ, സാമ്പത്തിക ആസൂത്രണം).',
  mni: 'Manipuri / Meitei in Bengali script (মৈতৈলোন্) - authentic Meiteilon vocabulary (e.g. ললোন-ইতিক, তেংবাং, থৌরাং), distinct from Bengali/Hindi.',
  mr: 'Marathi script (मराठी) - authentic Marathi vocabulary (e.g. व्यवसाय, सरकारी योजना, नफा-तोटा, आर्थिक नियोजन).',
  ne: 'Nepali in Devanagari script (नेपाली) - authentic Nepali vocabulary (e.g. व्यवसाय, सरकारी योजनाहरू, वित्तीय योजना, बचत).',
  or: 'Odia script (ଓଡ଼ିଆ ଲିପି) - authentic Odia vocabulary (e.g. ବ୍ୟବସାୟ, ସରକାରୀ ଯୋଜନା, ଆର୍ଥିକ ଯୋଜନା).',
  pa: 'Gurmukhi script (ਪੰਜਾਬੀ) - authentic Punjabi vocabulary (e.g. ਕਾਰੋਬਾਰ, ਸਰਕਾਰੀ ਸਕੀਮਾਂ, ਮੁਨਾਫ਼ਾ, ਵਿੱਤੀ ਯੋਜਨਾ).',
  sa: 'Sanskrit in Devanagari script (संस्कृतम्) - authentic classical Sanskrit vocabulary (e.g. उद्योगः, सर्वकारीय-योजनाः, आर्थिक-योजना, वृत्तान्तः).',
  sat: 'Santali in Ol Chiki / Devanagari script (ᱥᱟᱱᱛᱟᱲᱤ / संताली) - authentic Santali vocabulary, distinct from Bengali/Hindi.',
  sd: 'Sindhi in Arabic/Devanagari script (سنڌي / सिन्धी) - authentic Sindhi vocabulary (e.g. ڪاروبار, اسڪيمون, مالي منصوبو).',
  ta: 'Tamil script (தமிழ்) - authentic Tamil vocabulary (e.g. வணிகம், அரசு திட்டங்கள், நிதித் திட்டம், லாபம்).',
  te: 'Telugu script (తెలుగు) - authentic Telugu vocabulary (e.g. వ్యాపారం, ప్రభుత్వ పథకాలు, ఆర్థిక ప్రణాళిక, లాభం).',
  ur: 'Urdu in Perso-Arabic script (اردو) - authentic standard Urdu vocabulary (e.g. کاروبار, حکومتی اسکیمیں, مالیاتی منصوبہ, منافع).',
};

async function run() {
  const targetLanguages = SUPPORTED_LANGUAGES.filter(
    (l) => l.code !== 'en' && l.code !== 'hi' && l.code !== 'bn'
  );

  console.log(`Starting full native translation pass for ${targetLanguages.length} languages...`);

  for (const lang of targetLanguages) {
    const code = lang.code;
    console.log(`\nTranslating ${lang.name} (${code}) [${lang.nativeName}]...`);
    const scriptGuidance = SCRIPT_GUIDELINES[code] || `${lang.name} native script`;

    try {
      console.log(`  -> Translating Part 1 (${chunk1Keys.length} keys)...`);
      const res1 = await translateChunk(chunk1, code, lang.name, lang.nativeName, scriptGuidance);

      console.log(`  -> Translating Part 2 (${chunk2Keys.length} keys)...`);
      const res2 = await translateChunk(chunk2, code, lang.name, lang.nativeName, scriptGuidance);

      const mergedFlat: Record<string, string> = {};
      for (const k of keysList) {
        mergedFlat[k] = res1[k] || res2[k] || flatEn[k];
      }

      const unflattened = unflattenObject(mergedFlat);
      const filePath = path.resolve(process.cwd(), `src/i18n/locales/${code}.json`);
      fs.writeFileSync(filePath, JSON.stringify(unflattened, null, 2), 'utf-8');
      console.log(`  ✅ Successfully wrote ${filePath} (${Object.keys(mergedFlat).length} keys)`);
    } catch (err) {
      console.error(`  ❌ Failed translating ${code}:`, err);
    }
  }

  console.log('\nAll locale translations complete!');
}

run();
