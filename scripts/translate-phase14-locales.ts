import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import en from '../src/i18n/en';
import hi from '../src/i18n/hi';
import bn from '../src/i18n/bn';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const match = envContent.match(/GEMINI_API_KEY\s*=\s*([^\s\r\n]+)/);
const apiKey = match ? match[1].replace(/["']/g, '') : process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('GEMINI_API_KEY missing');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.5-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.1,
  },
});

const phase14EnglishKeys = {
  auth: {
    verifyEmailTitle: en.auth.verifyEmailTitle,
    verifyEmailSubtitle: en.auth.verifyEmailSubtitle,
    resendEmail: en.auth.resendEmail,
    resendCountdown: en.auth.resendCountdown,
    resendSuccess: en.auth.resendSuccess,
    verifiedRedirecting: en.auth.verifiedRedirecting,
    autoChecking: en.auth.autoChecking,
    logout: en.auth.logout,
    checkEmailTitle: en.auth.checkEmailTitle,
    checkEmailSubtitle: en.auth.checkEmailSubtitle,
    checkSpamNotice: en.auth.checkSpamNotice,
    sendAgain: en.auth.sendAgain,
  },
  admin: {
    deleteSchemeTitle: en.admin.deleteSchemeTitle,
    deleteSchemeSubtitle: en.admin.deleteSchemeSubtitle,
    confirmDeleteScheme: en.admin.confirmDeleteScheme,
  },
};

const allLocaleCodes = [
  { code: 'as', name: 'Assamese', script: 'Assamese script (অসমীয়া)' },
  { code: 'brx', name: 'Bodo', script: 'Devanagari script (बड़ो)' },
  { code: 'doi', name: 'Dogri', script: 'Devanagari script (डोगरी)' },
  { code: 'gu', name: 'Gujarati', script: 'Gujarati script (ગુજરાતી)' },
  { code: 'kn', name: 'Kannada', script: 'Kannada script (ಕನ್ನಡ)' },
  { code: 'ks', name: 'Kashmiri', script: 'Perso-Arabic script (کٲشُر)' },
  { code: 'kok', name: 'Konkani', script: 'Devanagari script (कोंकणी)' },
  { code: 'mai', name: 'Maithili', script: 'Devanagari script (मैथिली)' },
  { code: 'ml', name: 'Malayalam', script: 'Malayalam script (മലയാളം)' },
  { code: 'mni', name: 'Manipuri', script: 'Meetei Mayek / Bengali script (মৈতৈলোন্)' },
  { code: 'mr', name: 'Marathi', script: 'Devanagari script (मराठी)' },
  { code: 'ne', name: 'Nepali', script: 'Devanagari script (नेपाली)' },
  { code: 'or', name: 'Odia', script: 'Odia script (ଓଡ଼ିଆ)' },
  { code: 'pa', name: 'Punjabi', script: 'Gurmukhi script (ਪੰਜਾਬੀ)' },
  { code: 'sa', name: 'Sanskrit', script: 'Devanagari script (संस्कृतम्)' },
  { code: 'sat', name: 'Santali', script: 'Ol Chiki script (ᱥᱟᱱᱛᱟᱲᱤ)' },
  { code: 'sd', name: 'Sindhi', script: 'Perso-Arabic script (سنڌي)' },
  { code: 'ta', name: 'Tamil', script: 'Tamil script (தமிழ்)' },
  { code: 'te', name: 'Telugu', script: 'Telugu script (తెలుగు)' },
  { code: 'ur', name: 'Urdu', script: 'Nastaliq / Urdu script (اردو)' },
];

function deepMerge(target: any, source: any) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

async function run() {
  console.log('1. Updating en.json, hi.json, bn.json directly from source modules...');
  const localesDir = path.resolve(process.cwd(), 'src/i18n/locales');

  // Update en.json
  const enJsonPath = path.join(localesDir, 'en.json');
  const enJson = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'));
  deepMerge(enJson, phase14EnglishKeys);
  fs.writeFileSync(enJsonPath, JSON.stringify(enJson, null, 2), 'utf8');
  console.log('  ✅ en.json updated');

  // Update hi.json
  const hiJsonPath = path.join(localesDir, 'hi.json');
  const hiJson = JSON.parse(fs.readFileSync(hiJsonPath, 'utf8'));
  deepMerge(hiJson, {
    auth: {
      verifyEmailTitle: hi.auth.verifyEmailTitle,
      verifyEmailSubtitle: hi.auth.verifyEmailSubtitle,
      resendEmail: hi.auth.resendEmail,
      resendCountdown: hi.auth.resendCountdown,
      resendSuccess: hi.auth.resendSuccess,
      verifiedRedirecting: hi.auth.verifiedRedirecting,
      autoChecking: hi.auth.autoChecking,
      logout: hi.auth.logout,
      checkEmailTitle: hi.auth.checkEmailTitle,
      checkEmailSubtitle: hi.auth.checkEmailSubtitle,
      checkSpamNotice: hi.auth.checkSpamNotice,
      sendAgain: hi.auth.sendAgain,
    },
    admin: {
      deleteSchemeTitle: hi.admin.deleteSchemeTitle,
      deleteSchemeSubtitle: hi.admin.deleteSchemeSubtitle,
      confirmDeleteScheme: hi.admin.confirmDeleteScheme,
    },
  });
  fs.writeFileSync(hiJsonPath, JSON.stringify(hiJson, null, 2), 'utf8');
  console.log('  ✅ hi.json updated');

  // Update bn.json
  const bnJsonPath = path.join(localesDir, 'bn.json');
  const bnJson = JSON.parse(fs.readFileSync(bnJsonPath, 'utf8'));
  deepMerge(bnJson, {
    auth: {
      verifyEmailTitle: bn.auth.verifyEmailTitle,
      verifyEmailSubtitle: bn.auth.verifyEmailSubtitle,
      resendEmail: bn.auth.resendEmail,
      resendCountdown: bn.auth.resendCountdown,
      resendSuccess: bn.auth.resendSuccess,
      verifiedRedirecting: bn.auth.verifiedRedirecting,
      autoChecking: bn.auth.autoChecking,
      logout: bn.auth.logout,
      checkEmailTitle: bn.auth.checkEmailTitle,
      checkEmailSubtitle: bn.auth.checkEmailSubtitle,
      checkSpamNotice: bn.auth.checkSpamNotice,
      sendAgain: bn.auth.sendAgain,
    },
    admin: {
      deleteSchemeTitle: bn.admin.deleteSchemeTitle,
      deleteSchemeSubtitle: bn.admin.deleteSchemeSubtitle,
      confirmDeleteScheme: bn.admin.confirmDeleteScheme,
    },
  });
  fs.writeFileSync(bnJsonPath, JSON.stringify(bnJson, null, 2), 'utf8');
  console.log('  ✅ bn.json updated');

  console.log('\n2. Generating authentic translations for remaining 20 Scheduled Indian Languages in batches...');
  const chunkSize = 5;
  for (let i = 0; i < allLocaleCodes.length; i += chunkSize) {
    const chunk = allLocaleCodes.slice(i, i + chunkSize);
    console.log(`  Processing batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(allLocaleCodes.length / chunkSize)} (${chunk.map(c => c.code).join(', ')})...`);

    const prompt = `You are a master multilingual translator for official Indian Government and financial services interfaces.
Translate the following English strings into authentic translations for the specified Indian languages in their genuine native scripts.

Input English JSON:
${JSON.stringify(phase14EnglishKeys, null, 2)}

Target Languages:
${chunk.map((l) => `- "${l.code}": ${l.name} (${l.script})`).join('\n')}

CRITICAL REQUIREMENTS:
1. Return a single JSON object where each root key is the language code (${chunk.map(l => `"${l.code}"`).join(', ')}).
2. Each language object must contain exact nested "auth" and "admin" structures.
3. Preserve template placeholders exactly: "{email}", "{seconds}".
4. Use standard, clear, respectful language suitable for entrepreneurs.
5. All scripts must be authentic (e.g. Gurmukhi for Punjabi, Ol Chiki for Santali, Nastaliq/Perso-Arabic for Urdu/Sindhi/Kashmiri, Tamil script for Tamil, Telugu for Telugu, Odia for Odia, Kannada for Kannada, Malayalam for Malayalam, Devanagari for Bodo/Dogri/Konkani/Maithili/Marathi/Nepali/Sanskrit).
`;

    const res = await model.generateContent(prompt);
    const responseText = res.response.text().replace(/^```json\s*/, '').replace(/```\s*$/, '');
    const translations = JSON.parse(responseText);

    for (const lang of chunk) {
      if (translations[lang.code]) {
        const filePath = path.join(localesDir, `${lang.code}.json`);
        if (fs.existsSync(filePath)) {
          const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          deepMerge(existing, translations[lang.code]);
          fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
          console.log(`    ✅ Updated ${lang.code}.json (${lang.name})`);
        }
      } else {
        console.warn(`    ⚠️ Missing translations for ${lang.code}`);
      }
    }
  }

  console.log('\n🎉 ALL 23 LANGUAGE FILES SUCCESSFULLY SYNCHRONIZED FOR PHASE 14!');
}

run().catch((err) => {
  console.error('Translation script failed:', err);
  process.exit(1);
});
