/**
 * Guards the plan PDF's text handling, in Node (no browser, no AI).
 *
 * The report printed "₹1,625" as "¹1,625" — which reads as 11,625 — spread any
 * line containing ₹ or a non-breaking hyphen letter by letter off the page,
 * and kept an English narrative inside a Hindi report. The browser canvas path
 * for Indian scripts is checked separately in a headless browser.
 *
 *   npx tsx scripts/test-plan-pdf-text.ts
 */
import {
  generateBankReadyPlanPdf,
  narrativeNeedsTranslation,
  normalizePdfText,
} from '../src/lib/pdf/export-plan-pdf';
import { calculateFinancialPlan } from '../src/lib/calculator';
import en from '../src/i18n/en';
import type { PlanInputs } from '../src/types';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok && detail) console.log(`        ${detail}`);
}

async function main() {
  console.log('— text Helvetica can print —');
  check('₹ becomes "Rs." and the non-breaking hyphen a hyphen',
    normalizePdfText('₹1,625 pre‑booking', true) === 'Rs. 1,625 pre-booking', normalizePdfText('₹1,625 pre‑booking', true));
  check('₹ is kept where the browser draws the text', normalizePdfText('₹1,625', false, true) === '₹1,625');
  const cleaned = normalizePdfText('**bold** 🙂 text', true);
  check('markdown and emoji are removed', !cleaned.includes('**') && !cleaned.includes('🙂') && cleaned.includes('bold'), cleaned);

  console.log('\n— which narratives need translating —');
  check('an English narrative in a Hindi report', narrativeNeedsTranslation('The dairy unit is profitable', 'hi'));
  check('a Hindi narrative with acronyms in a Hindi report is left alone',
    !narrativeNeedsTranslation('डेयरी इकाई लाभदायक है, PMEGP लोन', 'hi'));
  check('a Bengali narrative in a Hindi report', narrativeNeedsTranslation('দুগ্ধ খামার লাভজনক', 'hi'));
  check('a Hindi narrative in an English report', narrativeNeedsTranslation('डेयरी इकाई लाभदायक है', 'en'));
  check('an English narrative in an English report is left alone', !narrativeNeedsTranslation('The dairy unit', 'en'));

  console.log('\n— the English report —');
  const inputs = {
    businessType: 'Dairy', planType: 'startup', businessScale: 'Micro', location: 'Kolkata',
    equipmentCost: 8000, setupCost: 2000, initialInventory: 2000, workingCapitalReserve: 1625, availableSavings: 12000,
    unitPrice: 60, unitsSoldPerMonth: 3000, monthlyRawMaterials: 800, monthlyRentUtilities: 300, monthlyLabor: 200,
  } as unknown as PlanInputs;
  const doc = await generateBankReadyPlanPdf({
    inputs,
    calculated: calculateFinancialPlan(inputs),
    narrative: {
      executiveSummary: 'A modest ₹1,625 loan with a pre‑booking plan.',
      keyAssumptions: ['Milk sells at ₹60/litre.'],
      riskAnalysis: ['Fodder prices can rise.'],
      actionableNextSteps: ['Get quotations.'],
    },
    profile: { name: 'Asha Das', gender: 'Female', availableCapital: 12000, desiredFunding: 1625 },
    t: en,
    language: 'en',
  });
  const raw = doc.output();
  check('no "¹" is printed in place of ₹', !raw.includes(String.fromCharCode(0xb9)));
  check('the fabricated 720 score is gone', !raw.includes('720 / 900'));
  check('the EMI label matches the calculation (9.5% over 36 months)', raw.includes('9.5% / 36 mo'));
  check('the assumptions and risks sections are printed',
    raw.includes('Key Operational Assumptions') && raw.includes('Risk Analysis'));
  check('footer includes the financial advice disclaimer',
    raw.includes('Guidance only, not regulated financial advice'));

  console.log(failed === 0 ? '\nAll plan PDF text checks passed.' : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
