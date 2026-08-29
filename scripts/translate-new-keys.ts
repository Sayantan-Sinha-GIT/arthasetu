import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import en from '../src/i18n/en';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const match = envContent.match(/GEMINI_API_KEY\s*=\s*([^\s\r\n]+)/);
const apiKey = match ? match[1].replace(/["']/g, '') : process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('GEMINI_API_KEY missing');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.6-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.1,
  },
});

const newEnglishChunk = {
  landing: {
    featureGovernanceTitle: en.landing.featureGovernanceTitle,
    featureGovernanceDesc: en.landing.featureGovernanceDesc,
    featureSavedPlansDesc: en.landing.featureSavedPlansDesc,
  },
  planner: {
    grossRevenue: en.planner.grossRevenue,
    operatingCosts: en.planner.operatingCosts,
    loanInterest: en.planner.loanInterest,
    loanEmi: en.planner.loanEmi,
    capexSubsidy: en.planner.capexSubsidy,
    netProfitPat: en.planner.netProfitPat,
    margin: en.planner.margin,
    bankDscr: en.planner.bankDscr,
    breakEvenPeriod: en.planner.breakEvenPeriod,
    unviable: en.planner.unviable,
    interactiveSimulation: en.planner.interactiveSimulation,
    whatIfTitle: en.planner.whatIfTitle,
    whatIfSubtitle: en.planner.whatIfSubtitle,
    adjustVariables: en.planner.adjustVariables,
    resetSliders: en.planner.resetSliders,
    loanGap: en.planner.loanGap,
    netProfit: en.planner.netProfit,
  },
  schemes: {
    subsidyBenefit: en.schemes.subsidyBenefit,
    maxFunding: en.schemes.maxFunding,
    lastVerifiedTooltip: en.schemes.lastVerifiedTooltip,
    whyMatches: en.schemes.whyMatches,
    verified: en.schemes.verified,
    collateralFree: en.schemes.collateralFree,
    upTo: en.schemes.upTo,
    subsidy: en.schemes.subsidy,
    lakhs: en.schemes.lakhs,
  },
};

const languagesMeta = [
  { code: 'hi', name: 'Hindi', script: 'Devanagari' },
  { code: 'as', name: 'Assamese', script: 'Bengali-Assamese script (অসমীয়া)' },
  { code: 'bn', name: 'Bengali', script: 'Bengali script (বাংলা)' },
  { code: 'brx', name: 'Bodo', script: 'Devanagari script (बर’/बोडो)' },
  { code: 'doi', name: 'Dogri', script: 'Devanagari script (डोगरी)' },
  { code: 'gu', name: 'Gujarati', script: 'Gujarati script (ગુજરાતી)' },
  { code: 'kn', name: 'Kannada', script: 'Kannada script (ಕನ್ನಡ)' },
  { code: 'ks', name: 'Kashmiri', script: 'Perso-Arabic script (کٲشُر)' },
  { code: 'kok', name: 'Konkani', script: 'Devanagari script (कोंकणी)' },
  { code: 'mai', name: 'Maithili', script: 'Devanagari script (मैथिली - authentic Mithila phrasing)' },
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

async function translateLocale(lang: { code: string; name: string; script: string }) {
  console.log(`Translating new keys for ${lang.name} (${lang.code})...`);
  const prompt = `You are a native professional translator and linguist in ${lang.name} (${lang.script}).
Translate the following new English UI strings into authentic ${lang.name} in native ${lang.script}.

RULES:
1. Use 100% native ${lang.script}.
2. Do not leave English text unless it's brand names like "ArthaSetu", "PMEGP", "DSCR", "PAT", "₹".
3. Return the exact JSON structure matching input keys.

Input JSON:
${JSON.stringify(newEnglishChunk, null, 2)}
`;

  try {
    const res = await model.generateContent(prompt);
    const text = res.response.text().replace(/^```json\s*/, '').replace(/```\s*$/, '');
    const translated = JSON.parse(text);
    
    const filePath = path.resolve(process.cwd(), `src/i18n/locales/${lang.code}.json`);
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const merged = deepMerge(existing, translated);
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
    console.log(`✅ Updated ${lang.code}.json`);
  } catch (err) {
    console.error(`❌ Failed for ${lang.code}:`, err);
  }
}

async function run() {
  for (const lang of languagesMeta) {
    await translateLocale(lang);
  }
  console.log('All 22 locales successfully updated with new keys!');
}

run();
