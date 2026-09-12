// ─── ArthaSetu Deterministic Financial Calculator ───
// CRITICAL ARCHITECTURE RULE: All financial arithmetic is computed deterministically here.
// NEVER let Gemini perform arithmetic calculations. Gemini only provides qualitative narrative.

import type { PlanInputs, CalculatedValues } from '@/types';

/** Loan terms assumed when the user gives none. The PDF report prints them, so they live in one place. */
export const DEFAULT_LOAN_INTEREST_RATE_PERCENT = 9.5;
export const DEFAULT_LOAN_TENURE_MONTHS = 36;

/**
 * Calculate the total initial capital needed to launch or expand the business
 */
export function calculateTotalInitialCost(inputs: PlanInputs): number {
  return (
    (inputs.equipmentCost || 0) +
    (inputs.setupCost || 0) +
    (inputs.initialInventory || 0) +
    (inputs.workingCapitalReserve || 0)
  );
}

/**
 * Calculate the funding gap that must be bridged via bank loan or government subsidy
 */
export function calculateFundingGap(totalInitialCost: number, availableSavings: number): number {
  return Math.max(0, totalInitialCost - (availableSavings || 0));
}

/**
 * Standard reducing-balance monthly loan EMI formula
 * EMI = [P x r x (1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMonthlyLoanEmi(
  principal: number,
  annualInterestRatePercent: number = DEFAULT_LOAN_INTEREST_RATE_PERCENT,
  tenureMonths: number = DEFAULT_LOAN_TENURE_MONTHS
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualInterestRatePercent <= 0) return Math.round(principal / tenureMonths);

  const monthlyRate = annualInterestRatePercent / 12 / 100;
  const growthFactor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * growthFactor) / (growthFactor - 1);

  return Math.round(emi);
}

/**
 * Calculate monthly gross revenue from primary sales and secondary streams
 */
export function calculateMonthlyGrossRevenue(inputs: PlanInputs): number {
  const primarySales = (inputs.unitPrice || 0) * (inputs.unitsSoldPerMonth || 0);
  const secondarySales = inputs.otherMonthlyRevenue || 0;
  return primarySales + secondarySales;
}

/**
 * Calculate monthly operating expenses excluding loan EMI
 */
export function calculateMonthlyOperatingExpenses(inputs: PlanInputs): number {
  return (
    (inputs.monthlyRawMaterials || 0) +
    (inputs.monthlyRentUtilities || 0) +
    (inputs.monthlyLabor || 0) +
    (inputs.monthlyTransportPackaging || 0) +
    (inputs.monthlyMaintenanceOther || 0)
  );
}

/**
 * Calculate the unit break-even quantity per month
 */
export function calculateBreakEvenUnits(inputs: PlanInputs, monthlyLoanEmi: number): number {
  const units = inputs.unitsSoldPerMonth || 1;
  const variableCostPerUnit =
    ((inputs.monthlyRawMaterials || 0) + (inputs.monthlyTransportPackaging || 0)) / units;
  const unitPrice = inputs.unitPrice || 0;
  const contributionMarginPerUnit = unitPrice - variableCostPerUnit;

  if (contributionMarginPerUnit <= 0) return 0;

  const monthlyFixedCost =
    (inputs.monthlyRentUtilities || 0) +
    (inputs.monthlyLabor || 0) +
    (inputs.monthlyMaintenanceOther || 0) +
    monthlyLoanEmi;

  return Math.ceil(monthlyFixedCost / contributionMarginPerUnit);
}

/**
 * Calculate break-even payback period in months
 */
export function calculateBreakEvenMonths(
  totalInitialCost: number,
  monthlyNetProfit: number
): number | null {
  if (monthlyNetProfit <= 0) return null;
  return Math.ceil(totalInitialCost / monthlyNetProfit);
}

/** Money and count fields that can never be negative. */
const NON_NEGATIVE_PLAN_FIELDS = [
  'currentMonthlyRevenue', 'currentMonthlyExpenses', 'expansionEquipmentCost', 'expansionWorkingCapital',
  'equipmentCost', 'setupCost', 'initialInventory', 'workingCapitalReserve',
  'unitPrice', 'unitsSoldPerMonth', 'otherMonthlyRevenue',
  'monthlyRawMaterials', 'monthlyRentUtilities', 'monthlyLabor', 'monthlyTransportPackaging', 'monthlyMaintenanceOther',
  'availableSavings', 'loanInterestRatePercent', 'loanTenureMonths',
] as const;

/**
 * Makes every numeric input a real, non-negative number before any arithmetic.
 *
 * The form now refuses negative entries, but inputs also arrive from the AI
 * advisor's tool calls (which can carry strings or negatives) and from plans
 * saved before that fix. A negative capital or a "12000" string used to flow
 * straight into the sums. Blank values stay undefined so defaults still apply.
 */
export function sanitizePlanInputs(inputs: PlanInputs): PlanInputs {
  const out: Record<string, unknown> = { ...inputs };
  for (const field of NON_NEGATIVE_PLAN_FIELDS) {
    const value = out[field];
    if (value === undefined || value === null || value === '') {
      out[field] = undefined;
      continue;
    }
    const n = typeof value === 'number' ? value : Number(String(value).replace(/[₹,\s]/g, ''));
    out[field] = Number.isFinite(n) && n > 0 ? n : 0;
  }
  if (out.projectedRevenueIncreasePercent !== undefined) {
    const n = Number(out.projectedRevenueIncreasePercent);
    out.projectedRevenueIncreasePercent = Number.isFinite(n) ? n : undefined;
  }
  return out as unknown as PlanInputs;
}

export const HIGH_NET_MARGIN_PERCENT = 60;
export const REVENUE_TO_COST_MULTIPLE = 20;

export interface PlausibilityWarning {
  code: 'revenue_vs_cost' | 'very_high_margin';
  /** For the model: it explains the concern to the user in their own language. */
  message: string;
}

/**
 * Figures that are arithmetically correct but not believable, so they must be
 * questioned rather than celebrated. A dairy plan with a 99.2% net margin was
 * described in its report as "exceptional profitability ... highly bankable",
 * which a loan officer would reject on sight.
 */
export function getPlausibilityWarnings(calculated: CalculatedValues): PlausibilityWarning[] {
  const warnings: PlausibilityWarning[] = [];
  if (calculated.totalInitialCost > 0 && calculated.monthlyGrossRevenue > calculated.totalInitialCost * REVENUE_TO_COST_MULTIPLE) {
    warnings.push({
      code: 'revenue_vs_cost',
      message: `Monthly revenue is over ${REVENUE_TO_COST_MULTIPLE}x the total initial project cost, which is highly unrealistic for a micro-enterprise.`,
    });
  }
  if (calculated.monthlyGrossRevenue > 0 && calculated.profitMarginPercent > HIGH_NET_MARGIN_PERCENT) {
    warnings.push({
      code: 'very_high_margin',
      message: `A ${calculated.profitMarginPercent}% net profit margin is far above what rural micro-enterprises usually earn (roughly 10-40%). Some monthly costs — raw material, feed, electricity, transport, or the owner's own labour — are probably missing or too low.`,
    });
  }
  return warnings;
}

/**
 * Main Orchestrator: Calculates complete financial metrics deterministically
 * Supports both:
 * 1. Startup Mode (New Business from scratch)
 * 2. Existing Business Expansion Mode (Starting from current cash flow & calculating growth gap)
 */
export function calculateFinancialPlan(rawInputs: PlanInputs): CalculatedValues {
  const inputs = sanitizePlanInputs(rawInputs);
  const isExistingBusiness = inputs.planType === 'existing_expansion';

  if (isExistingBusiness) {
    const currentRevenue = inputs.currentMonthlyRevenue || 0;
    const currentExpenses = inputs.currentMonthlyExpenses || 0;
    const currentMonthlyProfit = currentRevenue - currentExpenses;

    const expansionCapital =
      (inputs.expansionEquipmentCost || inputs.equipmentCost || 0) +
      (inputs.expansionWorkingCapital || inputs.workingCapitalReserve || 0) +
      (inputs.setupCost || 0);

    const fundingGap = calculateFundingGap(expansionCapital, inputs.availableSavings || 0);

    const monthlyLoanEmi = calculateMonthlyLoanEmi(
      fundingGap,
      inputs.loanInterestRatePercent ?? DEFAULT_LOAN_INTEREST_RATE_PERCENT,
      inputs.loanTenureMonths ?? DEFAULT_LOAN_TENURE_MONTHS
    );

    // Projected revenue after expansion
    const projectedGrossRevenue =
      inputs.unitPrice && inputs.unitsSoldPerMonth
        ? calculateMonthlyGrossRevenue(inputs)
        : currentRevenue * (1 + (inputs.projectedRevenueIncreasePercent || 35) / 100);

    // Projected operating expenses after expansion
    const projectedOperatingExpenses =
      inputs.monthlyRawMaterials
        ? calculateMonthlyOperatingExpenses(inputs)
        : currentExpenses * 1.15;

    const monthlyTotalExpenses = projectedOperatingExpenses + monthlyLoanEmi;
    const monthlyNetProfit = projectedGrossRevenue - monthlyTotalExpenses;
    const incrementalMonthlyProfit = monthlyNetProfit - currentMonthlyProfit;

    const profitMarginPercent =
      projectedGrossRevenue > 0
        ? Math.round((monthlyNetProfit / projectedGrossRevenue) * 1000) / 10
        : 0;

    const breakEvenUnitsPerMonth = calculateBreakEvenUnits(inputs, monthlyLoanEmi);
    
    // Payback period on expansion capital: incremental profit if positive, else total net profit
    const breakEvenMonths =
      incrementalMonthlyProfit > 0
        ? Math.ceil(expansionCapital / incrementalMonthlyProfit)
        : calculateBreakEvenMonths(expansionCapital, monthlyNetProfit);

    const annualNetProfit = monthlyNetProfit * 12;

    return {
      totalInitialCost: expansionCapital,
      fundingGap,
      monthlyGrossRevenue: Math.round(projectedGrossRevenue),
      monthlyOperatingExpenses: Math.round(projectedOperatingExpenses),
      monthlyLoanEmi,
      monthlyTotalExpenses: Math.round(monthlyTotalExpenses),
      monthlyNetProfit: Math.round(monthlyNetProfit),
      profitMarginPercent,
      breakEvenMonths,
      breakEvenUnitsPerMonth,
      annualNetProfit: Math.round(annualNetProfit),
      currentMonthlyProfit: Math.round(currentMonthlyProfit),
      incrementalMonthlyProfit: Math.round(incrementalMonthlyProfit),
    };
  }

  // Standard Startup Mode
  const totalInitialCost = calculateTotalInitialCost(inputs);
  const fundingGap = calculateFundingGap(totalInitialCost, inputs.availableSavings || 0);

  const monthlyLoanEmi = calculateMonthlyLoanEmi(
    fundingGap,
    inputs.loanInterestRatePercent ?? DEFAULT_LOAN_INTEREST_RATE_PERCENT,
    inputs.loanTenureMonths ?? DEFAULT_LOAN_TENURE_MONTHS
  );

  const monthlyGrossRevenue = calculateMonthlyGrossRevenue(inputs);
  const monthlyOperatingExpenses = calculateMonthlyOperatingExpenses(inputs);
  const monthlyTotalExpenses = monthlyOperatingExpenses + monthlyLoanEmi;
  const monthlyNetProfit = monthlyGrossRevenue - monthlyTotalExpenses;

  const profitMarginPercent =
    monthlyGrossRevenue > 0
      ? Math.round((monthlyNetProfit / monthlyGrossRevenue) * 1000) / 10
      : 0;

  const breakEvenUnitsPerMonth = calculateBreakEvenUnits(inputs, monthlyLoanEmi);
  const breakEvenMonths = calculateBreakEvenMonths(totalInitialCost, monthlyNetProfit);
  const annualNetProfit = monthlyNetProfit * 12;

  return {
    totalInitialCost,
    fundingGap,
    monthlyGrossRevenue,
    monthlyOperatingExpenses,
    monthlyLoanEmi,
    monthlyTotalExpenses,
    monthlyNetProfit,
    profitMarginPercent,
    breakEvenMonths,
    breakEvenUnitsPerMonth,
    annualNetProfit,
  };
}

// ─── Debt Service Coverage Ratio banding ───

/**
 * Which safety band a Debt Service Coverage Ratio falls into.
 * `no-debt` is distinct from `safe`: an unleveraged plan has no debt to
 * service at all, so a coverage ratio is not meaningful for it.
 */
export type DscrBand = 'no-debt' | 'safe' | 'marginal' | 'at-risk';

/** Lower bound of each band, in the order they are tested. */
export const DSCR_SAFE_THRESHOLD = 1.5;
export const DSCR_MARGINAL_THRESHOLD = 1.2;

/**
 * Classify a DSCR deterministically.
 *
 * Kept here, beside the rest of the financial maths, rather than inline in the
 * component: the banding is a lending judgement shown to entrepreneurs as a
 * safety verdict, so it belongs in the deterministic engine and must never be
 * AI-derived. It previously lived in WhatIfComparator with a 1.3 cut-off while
 * the label it selected read "Safe (DSCR > 1.5x)", so anything from 1.30 to
 * 1.49 was labelled safe on the strength of a threshold the label denied.
 */
export function classifyDscr(dscr: number, monthlyLoanEmi: number): DscrBand {
  if (!Number.isFinite(monthlyLoanEmi) || monthlyLoanEmi <= 0) return 'no-debt';
  if (!Number.isFinite(dscr)) return 'at-risk';
  if (dscr >= DSCR_SAFE_THRESHOLD) return 'safe';
  if (dscr >= DSCR_MARGINAL_THRESHOLD) return 'marginal';
  return 'at-risk';
}
