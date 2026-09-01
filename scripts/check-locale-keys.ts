import * as fs from 'fs';
import * as path from 'path';
import enData from '../src/i18n/en';

function flattenObject(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(flattenObject(obj[key], fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

const localesDir = path.join(__dirname, '../src/i18n/locales');
const enKeys = new Set(flattenObject(enData));

console.log(`Base English keys count: ${enKeys.size}`);
console.log('==================================================');
console.log('       I18N LOCALE KEYS COMPLETENESS AUDIT        ');
console.log('==================================================');

const files = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json') && f !== 'en.json');
let totalMissingAcrossLocales = 0;

for (const file of files) {
  const lang = file.replace('.json', '');
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const localeKeys = new Set(flattenObject(data));

  const missingKeys: string[] = [];
  for (const key of enKeys) {
    if (!localeKeys.has(key)) {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length === 0) {
    console.log(`✅ [100% COMPLETE] ${lang.toUpperCase()} (${file}): 0 missing keys (Total: ${localeKeys.size}/${enKeys.size})`);
  } else {
    console.log(`⚠️ [MISSING ${missingKeys.length} KEYS] ${lang.toUpperCase()} (${file}):`);
    missingKeys.forEach((k) => console.log(`   - ${k}`));
    totalMissingAcrossLocales += missingKeys.length;
  }
}

console.log('==================================================');
console.log(`Total missing keys across all 22 non-English locales: ${totalMissingAcrossLocales}`);
console.log('==================================================');
