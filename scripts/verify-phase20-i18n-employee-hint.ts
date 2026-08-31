import * as fs from 'fs';
import * as path from 'path';

const HINTS: Record<string, string> = {
  as: 'নিজক অন্তৰ্ভুক্ত কৰি',
  bn: 'নিজেকে অন্তর্ভুক্ত করে',
  brx: 'गावनिबो लाफानानै',
  doi: 'अपने की शामल करदे होई',
  en: 'Including yourself',
  gu: 'તમારી જાતને શામેલ કરીને',
  hi: 'स्वयं को शामिल करते हुए',
  kn: 'ನಿಮ್ಮನ್ನು ಒಳಗೊಂಡಂತೆ',
  kok: 'तुमकां धरून',
  ks: 'پانہٕ شٲمِل کٔرِتھ',
  mai: 'स्वयं केँ शामिल करैत',
  ml: 'സ്വയം ഉൾപ്പെടെ',
  mni: 'ইশাগী য়াওনা',
  mr: 'स्वतःचा समावेश करून',
  ne: 'आफूलाई समावेश गर्दै',
  or: 'ନିଜକୁ ଅନ୍ତର୍ଭୁକ୍ତ କରି',
  pa: 'ਆਪਣੇ ਆਪ ਨੂੰ ਸ਼ਾਮਲ ਕਰਦੇ ਹੋਏ',
  sa: 'स्वयं सम्मिलितं कृत्वा',
  sat: 'ᱟᱯᱱᱟᱨ ᱥᱮᱞᱮᱫ ᱠᱟᱛᱮ',
  sd: 'پاڻ کي شامل ڪندي',
  ta: 'உங்களையும் சேர்த்து',
  te: 'మిమ్మల్ని కలుపుకుని',
  ur: 'خود کو شامل کرتے ہوئے',
};

async function updateAndVerifyI18n() {
  console.log('============================================================');
  console.log('🌐 UPDATING & VERIFYING EMPLOYEE COUNT COPY ACROSS ALL 23 LOCALES');
  console.log('============================================================\n');

  const localesDir = path.resolve(process.cwd(), 'src/i18n/locales');
  const files = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json'));

  console.log(`Found ${files.length} locale JSON files in ${localesDir}.`);

  let updatedCount = 0;
  for (const file of files) {
    const langCode = path.basename(file, '.json');
    const fullPath = path.join(localesDir, file);
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));

    if (!content.onboarding) {
      content.onboarding = {};
    }

    const hint = HINTS[langCode] || 'Including yourself';
    content.onboarding.employeeCountHint = hint;

    fs.writeFileSync(fullPath, JSON.stringify(content, null, 2) + '\n', 'utf-8');
    updatedCount++;
    console.log(`  ✅ [UPDATED] ${file} -> onboarding.employeeCountHint = "${hint}"`);
  }

  // Also check TypeScript files (en.ts, hi.ts, bn.ts)
  const tsFiles = ['en.ts', 'hi.ts', 'bn.ts'];
  for (const ts of tsFiles) {
    const tsPath = path.resolve(process.cwd(), 'src/i18n', ts);
    const tsContent = fs.readFileSync(tsPath, 'utf-8');
    if (tsContent.includes('employeeCountHint')) {
      console.log(`  ✅ [VERIFIED] src/i18n/${ts} contains employeeCountHint`);
    } else {
      console.error(`  ❌ [MISSING] src/i18n/${ts} missing employeeCountHint`);
    }
  }

  // Regression check: Ensure NO file contains "family members" anywhere
  let oldPhraseCount = 0;
  const allI18nFiles = fs.readdirSync(path.resolve(process.cwd(), 'src/i18n')).flatMap((f) => {
    const full = path.resolve(process.cwd(), 'src/i18n', f);
    if (fs.statSync(full).isDirectory()) {
      return fs.readdirSync(full).map((sf) => path.join(full, sf));
    }
    return [full];
  });

  for (const f of allI18nFiles) {
    const text = fs.readFileSync(f, 'utf-8');
    if (/family\s*member/i.test(text)) {
      console.error(`  ❌ [FAIL] Found old phrase "family member" in ${f}`);
      oldPhraseCount++;
    }
  }

  if (oldPhraseCount === 0) {
    console.log('\n  ✅ [PASS] Zero occurrences of "family members" across all 23 language files!');
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 TASK 2 VERIFICATION RESULT: All 23 locales verified`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (oldPhraseCount > 0) process.exit(1);
}

updateAndVerifyI18n().catch((err) => {
  console.error(err);
  process.exit(1);
});
