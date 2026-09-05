import * as fs from 'fs';
import { resolve } from 'path';
import en from '../src/i18n/en';
import hi from '../src/i18n/hi';
import bn from '../src/i18n/bn';
import { SUPPORTED_LANGUAGES } from '../src/i18n/languages';

function flattenKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const newKey = prefix ? `${prefix}.${k}` : k;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      keys = keys.concat(flattenKeys(val, newKey));
    } else {
      keys.push(newKey);
    }
  }
  return keys;
}

function getValueByPath(obj: any, path: string): any {
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[p];
  }
  return curr;
}

const enKeys = flattenKeys(en);
console.log(`Total keys in en.ts: ${enKeys.length}`);

const localesDir = resolve(process.cwd(), 'src/i18n/locales');
const report: Record<string, { present: number; total: number; missing: string[] }> = {};

// Check hi.ts and bn.ts
const hiKeys = flattenKeys(hi);
const hiMissing = enKeys.filter(k => {
  const val = getValueByPath(hi, k);
  return val === undefined || val === null || val === '';
});
report['hi (hi.ts)'] = { present: enKeys.length - hiMissing.length, total: enKeys.length, missing: hiMissing };

const bnKeys = flattenKeys(bn);
const bnMissing = enKeys.filter(k => {
  const val = getValueByPath(bn, k);
  return val === undefined || val === null || val === '';
});
report['bn (bn.ts)'] = { present: enKeys.length - bnMissing.length, total: enKeys.length, missing: bnMissing };

report['en'] = { present: enKeys.length, total: enKeys.length, missing: [] };
report['hi'] = { present: enKeys.length - hiMissing.length, total: enKeys.length, missing: hiMissing };
report['bn'] = { present: enKeys.length - bnMissing.length, total: enKeys.length, missing: bnMissing };

// Check all locale JSON files
for (const lang of SUPPORTED_LANGUAGES) {
  if (lang.code === 'en' || lang.code === 'hi' || lang.code === 'bn') continue;
  const filePath = resolve(localesDir, `${lang.code}.json`);
  if (!fs.existsSync(filePath)) {
    report[lang.code] = { present: 0, total: enKeys.length, missing: enKeys };
    continue;
  }
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const missing = enKeys.filter(k => {
    const val = getValueByPath(content, k);
    return val === undefined || val === null || val === '';
  });
  report[lang.code] = { present: enKeys.length - missing.length, total: enKeys.length, missing };
}

console.log('\n=== TRANSLATION COVERAGE AUDIT BEFORE EXPANSION ===\n');
console.log('| Language Code | Language Name | Present / Total | Coverage % | Missing Count |');
console.log('|---|---|---|---|---|');

for (const lang of SUPPORTED_LANGUAGES) {
  const r = report[lang.code];
  const pct = ((r.present / r.total) * 100).toFixed(1);
  console.log(`| \`${lang.code}\` | ${lang.name} (${lang.nativeName}) | ${r.present}/${r.total} | ${pct}% | ${r.missing.length} |`);
}

if (report['hi (hi.ts)'].missing.length > 0) {
  console.log('\nMissing in hi.ts:', report['hi (hi.ts)'].missing);
}
if (report['bn (bn.ts)'].missing.length > 0) {
  console.log('\nMissing in bn.ts:', report['bn (bn.ts)'].missing);
}
