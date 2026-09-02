'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PlanInputs, CalculatedValues } from '@/types';

interface WhatIfComparatorProps {
  inputs: PlanInputs;
  calculated: CalculatedValues;
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
}

export default function WhatIfComparator({ inputs, calculated }: WhatIfComparatorProps) {
  const { t } = useLanguage();

  // Custom scenario adjustment sliders
  const [revenueDeltaPct, setRevenueDeltaPct] = useState(0); // -50% to +100%
  const [costsDeltaPct, setCostsDeltaPct] = useState(0); // -30% to +50%
  const [customInterestRate, setCustomInterestRate] = useState(inputs.loanInterestRatePercent || 10.5);
  const [capitalSubsidyPct, setCapitalSubsidyPct] = useState(0); // 0% to 40%

  // Helper to compute any scenario metrics deterministically
  const computeScenario = (
    title: string,
    badge: string,
    badgeColor: 'primary' | 'warning' | 'success' | 'info',
    revMultiplier: number,
    costMultiplier: number,
    interestRate: number,
    subsidyPercent: number
  ): ScenarioResult => {
    // 1. Adjusted Monthly Revenue
    const monthlyGrossRevenue = Math.round(
      (inputs.planType === 'existing_expansion'
        ? (inputs.currentMonthlyRevenue || 0) * (1 + (inputs.projectedRevenueIncreasePercent || 30) / 100)
        : (inputs.unitsSoldPerMonth || 1) * (inputs.unitPrice || 0)) * revMultiplier
    );

    // 2. Adjusted OPEX
    const rawMaterials = (inputs.monthlyRawMaterials || 0) * costMultiplier;
    const rentUtilities = inputs.monthlyRentUtilities || 0;
    const labor = inputs.monthlyLabor || 0;
    const transport = (inputs.monthlyTransportPackaging || 0) * costMultiplier;
    const maintenance = inputs.monthlyMaintenanceOther || 0;
    const monthlyOperatingCosts = Math.round(rawMaterials + rentUtilities + labor + transport + maintenance);

    // 3. Adjusted Initial Investment & Subsidy
    const baseCapEx =
      inputs.planType === 'existing_expansion'
        ? (inputs.expansionEquipmentCost || 0) + (inputs.expansionWorkingCapital || 0)
        : (inputs.equipmentCost || 0) + (inputs.setupCost || 0) + (inputs.initialInventory || 0) + (inputs.workingCapitalReserve || 0);

    const subsidyAmount = Math.round(baseCapEx * (subsidyPercent / 100));
    const effectiveCapEx = Math.max(0, baseCapEx - subsidyAmount);
    const fundingGap = Math.max(0, effectiveCapEx - (inputs.availableSavings || 0));

    // 4. Adjusted Loan EMI
    let monthlyLoanEmi = 0;
    const tenureMonths = inputs.loanTenureMonths || 36;
    if (fundingGap > 0 && interestRate > 0) {
      const monthlyRate = interestRate / 12 / 100;
      monthlyLoanEmi = Math.round(
        (fundingGap * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
          (Math.pow(1 + monthlyRate, tenureMonths) - 1)
      );
    }

    // 5. Net Profit (PAT)
    const monthlyNetProfit = monthlyGrossRevenue - monthlyOperatingCosts - monthlyLoanEmi;
    const profitMarginPercent =
      monthlyGrossRevenue > 0 ? Math.round((monthlyNetProfit / monthlyGrossRevenue) * 100) : 0;

    // 6. Break-Even Payback Period
    let breakEvenMonths: number | null = null;
    if (monthlyNetProfit > 0 && effectiveCapEx > 0) {
      breakEvenMonths = Math.ceil(effectiveCapEx / monthlyNetProfit);
    }

    // 7. DSCR (Debt Service Coverage Ratio)
    // Operating Cash Flow / Loan EMI
    const operatingCashFlow = monthlyGrossRevenue - monthlyOperatingCosts;
    const dscr = monthlyLoanEmi > 0 ? Number((operatingCashFlow / monthlyLoanEmi).toFixed(2)) : 9.99;

    let dscrStatus = t.planner.whatif.safeStatus;
    if (monthlyLoanEmi === 0) dscrStatus = t.planner.whatif.noDebtStatus;
    else if (dscr < 1.0) dscrStatus = t.planner.whatif.criticalRiskStatus;
    else if (dscr < 1.3) dscrStatus = t.planner.whatif.moderateRiskStatus;

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
    };
  };

  const baseline = computeScenario(
    t.planner.whatif.baseProjection,
    t.planner.whatif.standardModel,
    'primary',
    1.0,
    1.0,
    inputs.loanInterestRatePercent || 10.5,
    0
  );

  const conservative = computeScenario(
    t.planner.whatif.conservativeStress,
    t.planner.whatif.conservativeDesc,
    'warning',
    0.8,
    1.1,
    (inputs.loanInterestRatePercent || 10.5) + 1.5,
    0
  );

  const optimistic = computeScenario(
    t.planner.whatif.optimisticGrowth,
    t.planner.whatif.optimisticDesc,
    'success',
    1.25,
    0.95,
    inputs.loanInterestRatePercent || 10.5,
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
              setCustomInterestRate(inputs.loanInterestRatePercent || 10.5);
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

              {/* Status Badge */}
              <div className="pt-2 border-t border-border-subtle">
                <span className="text-[10px] font-bold text-muted block text-center">
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
