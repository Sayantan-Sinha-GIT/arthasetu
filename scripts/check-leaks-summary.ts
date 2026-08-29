import en from '../src/i18n/en';
import { getTranslations, SUPPORTED_LANGUAGES } from '../src/i18n';

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

function checkLang(obj: any, enObj: any, langCode: string): number {
  let count = 0;
  for (const k in enObj) {
    if (typeof enObj[k] === 'object' && enObj[k] !== null) {
      count += checkLang(obj ? obj[k] : {}, enObj[k], langCode);
    } else {
      const val = obj ? obj[k] : '';
      if (!val || val === enObj[k] || isLikelyEnglish(val, langCode)) {
        if (!isExempt(enObj[k])) count++;
      }
    }
  }
  return count;
}

console.log('--- LEAK REPORT PER LANGUAGE ---');
const problematicLangs: string[] = [];
for (const lang of SUPPORTED_LANGUAGES) {
  if (lang.code === 'en') continue;
  const t = getTranslations(lang.code);
  const leaks = checkLang(t, en, lang.code);
  console.log(`${lang.code.padEnd(5)} (${lang.name.padEnd(20)}): ${leaks} leaks`);
  if (leaks > 0) {
    problematicLangs.push(lang.code);
  }
}
console.log('Problematic languages:', problematicLangs);
