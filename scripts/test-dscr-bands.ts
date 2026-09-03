/**
 * Asserts the DSCR safety bands.
 *
 * Regression guard for the defect found before the SIH submission: the
 * comparator classified anything at or above 1.3 as safe while labelling it
 * "Safe (DSCR > 1.5x)", so a stress column showing 1.35x carried a badge
 * claiming a ratio it did not have. The 1.35 case below is that exact bug.
 *
 *   npx tsx scripts/test-dscr-bands.ts
 */
import {
  classifyDscr,
  DSCR_SAFE_THRESHOLD,
  DSCR_MARGINAL_THRESHOLD,
  type DscrBand,
} from '../src/lib/calculator';

interface Case {
  dscr: number;
  emi: number;
  expect: DscrBand;
  why: string;
}

const EMI = 5000;

const cases: Case[] = [
  // The reported defect.
  { dscr: 1.35, emi: EMI, expect: 'marginal', why: 'the value that was wrongly badged "Safe (DSCR > 1.5x)"' },

  // Safe band: at or above 1.5.
  { dscr: 1.5, emi: EMI, expect: 'safe', why: 'exactly on the safe threshold' },
  { dscr: 1.51, emi: EMI, expect: 'safe', why: 'just inside safe' },
  { dscr: 4.2, emi: EMI, expect: 'safe', why: 'comfortably covered' },
  { dscr: 9.99, emi: EMI, expect: 'safe', why: 'the sentinel used for very high coverage' },

  // Marginal band: 1.2 up to but excluding 1.5.
  { dscr: 1.2, emi: EMI, expect: 'marginal', why: 'exactly on the marginal threshold' },
  { dscr: 1.49, emi: EMI, expect: 'marginal', why: 'just below safe' },
  { dscr: 1.3, emi: EMI, expect: 'marginal', why: 'the old cut-off, which used to read as safe' },

  // At risk: below 1.2.
  { dscr: 1.19, emi: EMI, expect: 'at-risk', why: 'just below marginal' },
  { dscr: 1.0, emi: EMI, expect: 'at-risk', why: 'income exactly equals debt service' },
  { dscr: 0.4, emi: EMI, expect: 'at-risk', why: 'cannot service the debt' },
  { dscr: 0, emi: EMI, expect: 'at-risk', why: 'no operating cash flow' },
  { dscr: -2.5, emi: EMI, expect: 'at-risk', why: 'operating at a loss' },

  // No debt to service is a distinct verdict, not a safe one.
  { dscr: 9.99, emi: 0, expect: 'no-debt', why: 'unleveraged plan' },
  { dscr: 0.2, emi: 0, expect: 'no-debt', why: 'no EMI, so coverage is not meaningful' },

  // Degenerate inputs must not read as safe.
  { dscr: NaN, emi: EMI, expect: 'at-risk', why: 'NaN must never be badged safe' },
  { dscr: Infinity, emi: EMI, expect: 'at-risk', why: 'non-finite ratio' },
  { dscr: 2, emi: NaN, expect: 'no-debt', why: 'unusable EMI' },
];

let failed = 0;
console.log(`DSCR bands  (safe >= ${DSCR_SAFE_THRESHOLD}, marginal >= ${DSCR_MARGINAL_THRESHOLD})\n`);

for (const c of cases) {
  const actual = classifyDscr(c.dscr, c.emi);
  const ok = actual === c.expect;
  if (!ok) failed++;
  const label = `dscr=${String(c.dscr).padEnd(8)} emi=${String(c.emi).padEnd(6)}`;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} -> ${actual.padEnd(9)} ${ok ? '' : `(expected ${c.expect}) `}${c.why}`);
}

// The badge text must not promise a threshold the classifier does not enforce.
// This is what actually broke: the copy and the cut-off drifted apart.
console.log('');
const en = require('../src/i18n/en').default;
const safeLabel: string = en.planner.whatif.safeStatus;
const marginalLabel: string = en.planner.whatif.marginalStatus;
const atRiskLabel: string = en.planner.whatif.atRiskStatus;

const labelChecks: [string, boolean, string][] = [
  ['safe label quotes the safe threshold', safeLabel.includes(String(DSCR_SAFE_THRESHOLD)), safeLabel],
  ['marginal label quotes both bounds',
    marginalLabel.includes(String(DSCR_MARGINAL_THRESHOLD)) && marginalLabel.includes(String(DSCR_SAFE_THRESHOLD)),
    marginalLabel],
  ['at-risk label quotes the marginal threshold', atRiskLabel.includes(String(DSCR_MARGINAL_THRESHOLD)), atRiskLabel],
];

for (const [name, ok, value] of labelChecks) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: "${value}"`);
}

console.log(`\n${failed === 0 ? 'All DSCR band assertions passed.' : `${failed} assertion(s) FAILED.`}`);
process.exit(failed === 0 ? 0 : 1);
