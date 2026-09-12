import { describe, it, expect } from 'vitest';
import {
  classifyDscr,
  DSCR_SAFE_THRESHOLD,
  DSCR_MARGINAL_THRESHOLD,
  type DscrBand,
} from '@/lib/calculator';
import en from '@/i18n/en';

interface Case {
  dscr: number;
  emi: number;
  expected: DscrBand;
  why: string;
}

const EMI = 5000;

const cases: Case[] = [
  { dscr: 1.35, emi: EMI, expected: 'marginal', why: 'the value that was wrongly badged Safe (DSCR > 1.5x)' },
  { dscr: 1.5, emi: EMI, expected: 'safe', why: 'exactly on the safe threshold' },
  { dscr: 1.51, emi: EMI, expected: 'safe', why: 'just inside safe' },
  { dscr: 4.2, emi: EMI, expected: 'safe', why: 'comfortably covered' },
  { dscr: 9.99, emi: EMI, expected: 'safe', why: 'the sentinel used for very high coverage' },
  { dscr: 1.2, emi: EMI, expected: 'marginal', why: 'exactly on the marginal threshold' },
  { dscr: 1.49, emi: EMI, expected: 'marginal', why: 'just below safe' },
  { dscr: 1.3, emi: EMI, expected: 'marginal', why: 'the old cut-off, which used to read as safe' },
  { dscr: 1.19, emi: EMI, expected: 'at-risk', why: 'just below marginal' },
  { dscr: 1.0, emi: EMI, expected: 'at-risk', why: 'income exactly equals debt service' },
  { dscr: 0.4, emi: EMI, expected: 'at-risk', why: 'cannot service the debt' },
  { dscr: 0, emi: EMI, expected: 'at-risk', why: 'no operating cash flow' },
  { dscr: -2.5, emi: EMI, expected: 'at-risk', why: 'operating at a loss' },
  { dscr: 9.99, emi: 0, expected: 'no-debt', why: 'unleveraged plan' },
  { dscr: 0.2, emi: 0, expected: 'no-debt', why: 'no EMI, so coverage is not meaningful' },
  { dscr: NaN, emi: EMI, expected: 'at-risk', why: 'NaN must never be badged safe' },
  { dscr: Infinity, emi: EMI, expected: 'at-risk', why: 'non-finite ratio' },
  { dscr: 2, emi: NaN, expected: 'no-debt', why: 'unusable EMI' },
];

describe('DSCR Bands and Classifier', () => {
  it.each(cases)('should classify dscr=$dscr emi=$emi as $expected ($why)', ({ dscr, emi, expected }) => {
    expect(classifyDscr(dscr, emi)).toBe(expected);
  });

  it('verifies i18n labels match numerical thresholds', () => {
    const safeLabel = en.planner.whatif.safeStatus;
    const marginalLabel = en.planner.whatif.marginalStatus;
    const atRiskLabel = en.planner.whatif.atRiskStatus;

    expect(safeLabel).toContain(String(DSCR_SAFE_THRESHOLD));
    expect(marginalLabel).toContain(String(DSCR_MARGINAL_THRESHOLD));
    expect(marginalLabel).toContain(String(DSCR_SAFE_THRESHOLD));
    expect(atRiskLabel).toContain(String(DSCR_MARGINAL_THRESHOLD));
  });
});
