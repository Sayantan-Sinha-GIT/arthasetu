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
  model: 'gemini-3.5-flash-lite',
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

const remainingLanguages = [
  { code: 'kok', name: 'Konkani', script: 'Devanagari script (कोंकणी)' },
  { code: 'mai', name: 'Maithili', script: 'Devanagari script (मैथिली - authentic Mithila phrasing)' },
  { code: 'ml', name: 'Malayalam', script: 'Malayalam script (മലയാളം)' },
  { code: 'mni', name: 'Manipuri', script: 'Bengali/Meetei script (মৈতৈলোন্)' },
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

async function batchTranslate() {
  console.log('Sending single batch translation request for all remaining languages...');
  const prompt = `You are an expert multilingual linguist in Scheduled Indian Languages.
Translate the following English JSON structure into the specified 14 Indian languages, authentic to their native scripts.

Input English JSON:
${JSON.stringify(newEnglishChunk, null, 2)}

Target Languages:
${remainingLanguages.map((l) => `- "${l.code}": ${l.name} in ${l.script}`).join('\n')}

CRITICAL INSTRUCTIONS:
1. Return a JSON object with root keys being the language codes (${remainingLanguages.map((l) => `"${l.code}"`).join(', ')}).
2. Each language object must mirror the exact nested structure (landing, planner, schemes).
3. Translate into 100% genuine native script for that language (e.g. Odia in Odia script, Punjabi in Gurmukhi, Tamil in Tamil, Urdu/Sindhi in Perso-Arabic, Santali in Ol Chiki, etc.). Keep acronyms like "ArthaSetu", "PMEGP", "DSCR", "PAT", "₹" intact.
`;

  const res = await model.generateContent(prompt);
  const text = res.response.text().replace(/^```json\s*/, '').replace(/```\s*$/, '');
  const allTranslations = JSON.parse(text);

  for (const lang of remainingLanguages) {
    if (allTranslations[lang.code]) {
      const filePath = path.resolve(process.cwd(), `src/i18n/locales/${lang.code}.json`);
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const merged = deepMerge(existing, allTranslations[lang.code]);
      fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
      console.log(`✅ Updated ${lang.code}.json`);
    } else {
      console.warn(`⚠️ Missing translation for ${lang.code}`);
    }
  }
  console.log('All remaining languages successfully updated!');
}

batchTranslate().catch((err) => {
  console.error('Batch translation failed:', err);
  process.exit(1);
});
