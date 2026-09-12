'use client';

import { useState } from 'react';
import {
  calculateFinancialPlan,
  classifyDscr,
  DEFAULT_LOAN_INTEREST_RATE_PERCENT,
  type DscrBand,
} from '@/lib/calculator';
import Card from '@/components/ui/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PlanInputs } from '@/types';

interface WhatIfComparatorProps {
  inputs: PlanInputs;
}

interface ScenarioResult {
  title: string;
  badge: string;
  badgeColor: 'primary' | 'warning' | 'success' | 'info';
  monthlyGrossRevenue: number;
  monthlyOperatingCosts: number;
  monthlyLoanEmi: number;
  monthlyNetProfit: number;
  profitMarginPercent: number;
  breakEvenMonths: number | null;
  dscr: number;
  dscrStatus: string;
  dscrBand: DscrBand;
}

/** Teal for safe, saffron for marginal, red for at risk. */
const DSCR_BAND_CLASSES: Record<DscrBand, string> = {
  safe: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  marginal: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30',
  'at-risk': 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30',
  'no-debt': 'bg-surface text-muted border border-border-subtle',
};

export default function WhatIfComparator({ inputs }: WhatIfComparatorProps) {
  const { t } = useLanguage();

  // Custom scenario adjustment sliders
  const [revenueDeltaPct, setRevenueDeltaPct] = useState(0); // -50% to +100%
  const [costsDeltaPct, setCostsDeltaPct] = useState(0); // -30% to +50%
  const baseInterestRate = inputs.loanInterestRatePercent ?? DEFAULT_LOAN_INTEREST_RATE_PERCENT;
  const [customInterestRate, setCustomInterestRate] = useState(baseInterestRate);
  const [capitalSubsidyPct, setCapitalSubsidyPct] = useState(0); // 0% to 40%

  // Every scenario runs through the same calculator as the plan itself, with its
  // inputs scaled. This used to be a separate copy of the arithmetic that
  // disagreed with the plan on the same page: 10.5% interest where the plan used
  // 9.5%, a 30% growth default where the plan used 35%, setup costs left out of
  // expansions, and no estimate of an existing business's running expenses.
  const computeScenario = (
    title: string,
    badge: string,
    badgeColor: 'primary' | 'warning' | 'success' | 'info',
    revMultiplier: number,
    costMultiplier: number,
    interestRate: number,
    subsidyPercent: number
  ): ScenarioResult => {
    const scale = (value: number | undefined, factor: number) => (value === undefined ? undefined : value * factor);
    const capexKept = 1 - subsidyPercent / 100;
    const scenario = calculateFinancialPlan({
      ...inputs,
      // Revenue
      unitPrice: scale(inputs.unitPrice, revMultiplier) as number,
      otherMonthlyRevenue: scale(inputs.otherMonthlyRevenue, revMultiplier) as number,
      currentMonthlyRevenue: scale(inputs.currentMonthlyRevenue, revMultiplier),
      // Costs that move with volume and prices
      monthlyRawMaterials: scale(inputs.monthlyRawMaterials, costMultiplier) as number,
      monthlyTransportPackaging: scale(inputs.monthlyTransportPackaging, costMultiplier) as number,
      currentMonthlyExpenses: scale(inputs.currentMonthlyExpenses, costMultiplier),
      // A capital subsidy lowers what has to be financed
      equipmentCost: scale(inputs.equipmentCost, capexKept) as number,
      setupCost: scale(inputs.setupCost, capexKept) as number,
      initialInventory: scale(inputs.initialInventory, capexKept) as number,
      workingCapitalReserve: scale(inputs.workingCapitalReserve, capexKept) as number,
      expansionEquipmentCost: scale(inputs.expansionEquipmentCost, capexKept),
      expansionWorkingCapital: scale(inputs.expansionWorkingCapital, capexKept),
      loanInterestRatePercent: interestRate,
    });

    const monthlyGrossRevenue = scenario.monthlyGrossRevenue;
    const monthlyOperatingCosts = scenario.monthlyOperatingExpenses;
    const monthlyLoanEmi = scenario.monthlyLoanEmi;
    const monthlyNetProfit = scenario.monthlyNetProfit;
    const profitMarginPercent = scenario.profitMarginPercent;
    const breakEvenMonths = scenario.breakEvenMonths;

    // DSCR (Debt Service Coverage Ratio): Operating Cash Flow / Loan EMI
    const operatingCashFlow = monthlyGrossRevenue - monthlyOperatingCosts;
    const dscr = monthlyLoanEmi > 0 ? Number((operatingCashFlow / monthlyLoanEmi).toFixed(2)) : 9.99;

    // Label and colour both derive from the deterministic band, so the badge
    // can never contradict the number printed directly above it.
    const dscrBand = classifyDscr(dscr, monthlyLoanEmi);
    const dscrStatus =
      dscrBand === 'no-debt' ? t.planner.whatif.noDebtStatus
      : dscrBand === 'safe' ? t.planner.whatif.safeStatus
      : dscrBand === 'marginal' ? t.planner.whatif.marginalStatus
      : t.planner.whatif.atRiskStatus;

    return {
      title,
      badge,
      badgeColor,
      monthlyGrossRevenue,
      monthlyOperatingCosts,
      monthlyLoanEmi,
      monthlyNetProfit,
      profitMarginPercent,
      breakEvenMonths,
      dscr,
      dscrStatus,
      dscrBand,
    };
  };

  const baseline = computeScenario(
    t.planner.whatif.baseProjection,
    t.planner.whatif.standardModel,
    'primary',
    1.0,
    1.0,
    baseInterestRate,
    0
  );

  const conservative = computeScenario(
    t.planner.whatif.conservativeStress,
    t.planner.whatif.conservativeDesc,
    'warning',
    0.8,
    1.1,
    baseInterestRate + 1.5,
    0
  );

  const optimistic = computeScenario(
    t.planner.whatif.optimisticGrowth,
    t.planner.whatif.optimisticDesc,
    'success',
    1.25,
    0.95,
    baseInterestRate,
    25
  );

  const custom = computeScenario(
    t.planner.whatif.customSimulation,
    t.planner.whatif.liveSliders,
    'info',
    1 + revenueDeltaPct / 100,
    1 + costsDeltaPct / 100,
    customInterestRate,
    capitalSubsidyPct
  );

  const scenarios = [baseline, conservative, optimistic, custom];

  return (
    <Card padding="lg" className="space-y-6 border-navy-700/60 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <h3 className="text-lg font-bold text-foreground">
              {t.planner.whatIfTitle}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
              {t.planner.interactiveSimulation}
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            {t.planner.whatIfSubtitle}
          </p>
        </div>
      </div>

      {/* Interactive Sliders for Custom Scenario */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-4 text-xs">
        <h4 className="font-bold text-foreground flex items-center justify-between">
          <span>🎛️ {t.planner.adjustVariables}:</span>
          <button
            type="button"
            onClick={() => {
              setRevenueDeltaPct(0);
              setCostsDeltaPct(0);
              setCustomInterestRate(baseInterestRate);
              setCapitalSubsidyPct(0);
            }}
            className="text-xs text-primary font-bold hover:underline"
          >
            {t.planner.resetSliders}
          </button>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted">{t.planner.grossRevenue}:</span>
              <span className="font-bold text-foreground">
                {revenueDeltaPct >= 0 ? `+${revenueDeltaPct}%` : `${revenueDeltaPct}%`}
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={100}
              step={5}
              value={revenueDeltaPct}
              onChange={(e) => setRevenueDeltaPct(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* Costs Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted">{t.planner.operatingCosts}:</span>
              <span className="font-bold text-foreground">
                {costsDeltaPct >= 0 ? `+${costsDeltaPct}%` : `${costsDeltaPct}%`}
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={50}
              step={5}
              value={costsDeltaPct}
              onChange={(e) => setCostsDeltaPct(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* Interest Rate Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted">{t.planner.loanInterest}:</span>
              <span className="font-bold text-foreground">{customInterestRate}% p.a.</span>
            </div>
            <input
              type="range"
              min={6}
              max={18}
              step={0.5}
              value={customInterestRate}
              onChange={(e) => setCustomInterestRate(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* Subsidy Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted">{t.planner.capexSubsidy}:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {capitalSubsidyPct}% (PMEGP/State)
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={5}
              value={capitalSubsidyPct}
              onChange={(e) => setCapitalSubsidyPct(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenarios.map((sc, idx) => {
          const isCustom = idx === 3;
          const isBaseline = idx === 0;

          return (
            <div
              key={idx}
              className={`
                p-5 rounded-2xl border space-y-4 flex flex-col justify-between transition-all
                ${isCustom
                  ? 'bg-blue-500/5 border-blue-500/40 ring-1 ring-blue-500/20'
                  : isBaseline
                  ? 'bg-surface border-border'
                  : idx === 1
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : 'bg-emerald-500/5 border-emerald-500/30'
                }
              `}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-foreground">
                    {sc.title}
                  </h4>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-surface-elevated border border-border text-muted">
                    {sc.badge}
                  </span>
                </div>

                <div className="pt-2 space-y-2.5 text-xs">
                  {/* Gross Revenue */}
                  <div className="flex justify-between items-center py-1 border-b border-border-subtle">
                    <span className="text-muted">{t.planner.grossRevenue}:</span>
                    <span className="font-bold text-foreground">
                      ₹{sc.monthlyGrossRevenue.toLocaleString('en-IN')}/mo
                    </span>
                  </div>

                  {/* Monthly OPEX */}
                  <div className="flex justify-between items-center py-1 border-b border-border-subtle">
                    <span className="text-muted">{t.planner.operatingCosts}:</span>
                    <span className="font-semibold text-foreground">
                      ₹{sc.monthlyOperatingCosts.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Loan EMI */}
                  <div className="flex justify-between items-center py-1 border-b border-border-subtle">
                    <span className="text-muted">{t.planner.loanEmi}:</span>
                    <span className="font-semibold text-foreground">
                      ₹{sc.monthlyLoanEmi.toLocaleString('en-IN')}/mo
                    </span>
                  </div>

                  {/* Net Monthly Profit */}
                  <div className="p-2.5 rounded-xl bg-surface-elevated border border-border flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted block font-medium">{t.planner.netProfitPat}</span>
                      <span className="text-[10px] text-muted font-bold">{t.planner.margin}: {sc.profitMarginPercent}%</span>
                    </div>
                    <span className={`text-sm font-black ${sc.monthlyNetProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {sc.monthlyNetProfit >= 0 ? '+' : ''}₹{sc.monthlyNetProfit.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Break Even */}
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted">{t.planner.breakEvenPeriod}:</span>
                    <span className="font-bold text-foreground">
                      {sc.breakEvenMonths ? `${sc.breakEvenMonths} Months` : t.planner.unviable}
                    </span>
                  </div>

                  {/* Bank DSCR */}
                  <div className="flex justify-between items-center text-[11px] pt-1">
                    <span className="text-muted">{t.planner.bankDscr}:</span>
                    <span className="font-bold text-foreground">
                      {sc.dscr}x
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge — colour tracks the band, so a red verdict cannot
                  be mistaken for a safe one at a glance. */}
              <div className="pt-2 border-t border-border-subtle">
                <span
                  className={`text-[10px] font-bold block text-center rounded-lg py-1 px-2 ${DSCR_BAND_CLASSES[sc.dscrBand]}`}
                >
                  {sc.dscrStatus}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
