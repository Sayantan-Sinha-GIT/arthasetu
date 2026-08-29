export {};

import en from '../src/i18n/en';
import hi from '../src/i18n/hi';
import bn from '../src/i18n/bn';
import { getTranslations, SUPPORTED_LANGUAGES } from '../src/i18n';

interface LeakItem {
  langCode: string;
  langName: string;
  keyPath: string;
  enValue: string;
  currentValue: string;
}

// Brand names, symbols, or technical terms that are legitimately English/Latin in all locales
const EXEMPT_PATTERNS = [
  /^ArthaSetu$/,
  /^₹$/,
  /^AI$/,
  /^PDF$/,
  /^PMEGP$/,
  /^MUDRA$/,
  /^KVIC$/,
  /^DIC$/,
  /^MSME$/,
  /^DPR$/,
  /^KYC$/,
  /^PAN$/,
  /^URL$/,
  /^PAT$/,
  /^EMI$/,
  /^DSCR$/,
  /^SHG$/,
  /^WhatsApp$/,
  /^SMS$/,
  /^0$/,
  /^1$/,
  /^2$/,
  /^3$/,
  /^4$/,
  /^5$/,
  /^300$/,
  /^900$/,
  /^4632$/,
  /CoreDumped/,
  /^[\d\s,.\-%+/():•✓⚠️🚀🏛️📊🎙️📋💡📂⏳⚖️🌾🪪🏢👥🎛️🔔🔕🔒🛡️📜✨]*$/,
];

function isExempt(val: string): boolean {
  if (!val || typeof val !== 'string') return true;
  const trimmed = val.trim();
  if (trimmed.length === 0) return true;
  return EXEMPT_PATTERNS.some((pat) => pat.test(trimmed));
}

// Checks if a string contains mostly Latin characters (indicating English leak for non-Latin scripts)
function isLikelyEnglish(str: string, langCode: string): boolean {
  if (isExempt(str)) return false;
  
  // English itself is expected to be English
  if (langCode === 'en') return false;

  // Filter out punctuation, numbers, and emojis
  const lettersOnly = str.replace(/[\d\s\p{P}\p{S}]/gu, '');
  if (lettersOnly.length === 0) return false;

  // Count Latin characters
  const latinMatches = lettersOnly.match(/[A-Za-z]/g) || [];
  const latinRatio = latinMatches.length / lettersOnly.length;

  // If >50% of the alphabetic characters are Latin, it's an English leak in an Indian language
  return latinRatio > 0.5;
}

function traverse(
  obj: any,
  enObj: any,
  prefix: string,
  langCode: string,
  langName: string,
  leaks: LeakItem[]
) {
  if (!obj || typeof obj !== 'object') return;

  for (const key of Object.keys(enObj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    const enVal = enObj[key];

    if (typeof enVal === 'object' && enVal !== null) {
      traverse(val || {}, enVal, currentPath, langCode, langName, leaks);
    } else if (typeof enVal === 'string') {
      const strVal = typeof val === 'string' ? val : '';
      
      // Check if value is identical to English or has high Latin ratio
      if (!strVal || strVal === enVal || isLikelyEnglish(strVal, langCode)) {
        if (!isExempt(enVal)) {
          leaks.push({
            langCode,
            langName,
            keyPath: currentPath,
            enValue: enVal,
            currentValue: strVal || '<MISSING>',
          });
        }
      }
    }
  }
}

async function auditEnglishLeaks() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 FULL VALUE-LEVEL AUDIT: ENGLISH LEAKS IN ALL 22 SCHEDULED LANGUAGES');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const allLeaks: LeakItem[] = [];

  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang.code === 'en') continue;

    const dict = getTranslations(lang.code);
    const langLeaks: LeakItem[] = [];

    traverse(dict, en, '', lang.code, lang.name, langLeaks);

    console.log(`▶ [${lang.code.toUpperCase().padEnd(4)}] ${lang.name.padEnd(16)} : ${langLeaks.length} English-leak keys identified`);
    allLeaks.push(...langLeaks);
  }

  console.log('\n───────────────────────────────────────────────────────────────────────────');
  console.log(`TOTAL FLAGGED ENGLISH LEAKS ACROSS ALL 22 LANGUAGES: ${allLeaks.length}`);
  console.log('───────────────────────────────────────────────────────────────────────────\n');

  // Group by category/keyPath for easy review
  const groupedByKey: Record<string, string[]> = {};
  for (const leak of allLeaks) {
    if (!groupedByKey[leak.keyPath]) {
      groupedByKey[leak.keyPath] = [];
    }
    groupedByKey[leak.keyPath].push(`${leak.langCode} ("${leak.currentValue.slice(0, 40)}")`);
  }

  console.log('📋 SUMMARY OF FLAGGED KEY PATHS AND AFFECTED LANGUAGES:\n');
  for (const [keyPath, langs] of Object.entries(groupedByKey)) {
    console.log(`• ${keyPath} (${langs.length} languages affected):`);
    console.log(`   Sample value: ${langs[0]}`);
  }

  return allLeaks;
}

auditEnglishLeaks().catch(console.error);
