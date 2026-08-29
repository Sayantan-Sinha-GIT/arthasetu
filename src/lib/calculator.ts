// ─── ArthaSetu Deterministic Financial Calculator ───
// CRITICAL ARCHITECTURE RULE: All financial arithmetic is computed deterministically here.
// NEVER let Gemini perform arithmetic calculations. Gemini only provides qualitative narrative.

import type { PlanInputs, CalculatedValues } from '@/types';

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
  annualInterestRatePercent: number = 9.5,
  tenureMonths: number = 36
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

/**
 * Main Orchestrator: Calculates complete financial metrics deterministically
 * Supports both:
 * 1. Startup Mode (New Business from scratch)
 * 2. Existing Business Expansion Mode (Starting from current cash flow & calculating growth gap)
 */
export function calculateFinancialPlan(inputs: PlanInputs): CalculatedValues {
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
      inputs.loanInterestRatePercent ?? 9.5,
      inputs.loanTenureMonths ?? 36
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
    inputs.loanInterestRatePercent ?? 9.5,
    inputs.loanTenureMonths ?? 36
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
