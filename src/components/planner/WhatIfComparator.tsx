'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
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
    subsidyPct: number
  ): ScenarioResult => {
    // 1. Initial Investment and Subsidy Adjustment
    const baseTotalCapEx = calculated.totalInitialCost;
    const subsidyAmount = Math.round(baseTotalCapEx * (subsidyPct / 100));
    const effectiveFundingGap = Math.max(0, calculated.fundingGap - subsidyAmount);

    // 2. Loan EMI (reducing balance formula)
    const monthlyRate = interestRate / 12 / 100;
    const n = Math.max(1, inputs.loanTenureMonths || 36);
    const emi =
      effectiveFundingGap > 0 && monthlyRate > 0
        ? Math.round(
            (effectiveFundingGap * monthlyRate * Math.pow(1 + monthlyRate, n)) /
              (Math.pow(1 + monthlyRate, n) - 1)
          )
        : 0;

    // 3. Revenue & Operating Costs
    const grossRev = Math.round(calculated.monthlyGrossRevenue * revMultiplier);
    const baseOpex =
      inputs.monthlyRawMaterials +
      inputs.monthlyRentUtilities +
      inputs.monthlyLabor +
      inputs.monthlyTransportPackaging +
      inputs.monthlyMaintenanceOther;
    const opex = Math.round(baseOpex * costMultiplier);

    // 4. Net Profit
    const netProfit = grossRev - opex - emi;
    const margin = grossRev > 0 ? Math.round((netProfit / grossRev) * 100) : 0;

    // 5. Break-Even Payback
    const breakEven =
      netProfit > 0 ? Math.ceil(baseTotalCapEx / netProfit) : null;

    // 6. DSCR (Debt Service Coverage Ratio) = Annual Operating Income / Annual Debt Service
    const annualNOI = (grossRev - opex) * 12;
    const annualDebt = emi * 12;
    const dscr = annualDebt > 0 ? Number((annualNOI / annualDebt).toFixed(2)) : 5.0;

    let dscrStatus = 'Excellent Bank Safety 🟢';
    if (dscr < 1.25) {
      dscrStatus = 'High Risk / Low Margin 🔴';
    } else if (dscr < 1.75) {
      dscrStatus = 'Standard Bank Norm 🟡';
    }

    return {
      title,
      badge,
      badgeColor,
      monthlyGrossRevenue: grossRev,
      monthlyOperatingCosts: opex,
      monthlyLoanEmi: emi,
      monthlyNetProfit: netProfit,
      profitMarginPercent: margin,
      breakEvenMonths: breakEven,
      dscr,
      dscrStatus,
    };
  };

  const baseline = computeScenario(
    'Baseline Plan',
    'Current Setup',
    'primary',
    1.0,
    1.0,
    inputs.loanInterestRatePercent || 10.5,
    0
  );

  const conservative = computeScenario(
    'Conservative Stress Test',
    '-20% Sales, +10% Costs',
    'warning',
    0.8,
    1.1,
    (inputs.loanInterestRatePercent || 10.5) + 1.5,
    0
  );

  const optimistic = computeScenario(
    'Optimistic Growth',
    '+25% Sales, 25% PMEGP Subsidy',
    'success',
    1.25,
    0.95,
    inputs.loanInterestRatePercent || 10.5,
    25
  );

  const custom = computeScenario(
    'Custom Simulation',
    'Live Sliders',
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
              What-If Financial Stress &amp; Growth Comparator
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
              Interactive Simulation
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Compare your baseline projection against market slowdowns, festive demand spikes, and government subsidy grants
          </p>
        </div>
      </div>

      {/* Interactive Sliders for Custom Scenario */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-4 text-xs">
        <h4 className="font-bold text-foreground flex items-center justify-between">
          <span>🎛️ Adjust Custom Simulation Variables:</span>
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
            Reset Sliders
          </button>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted">Monthly Revenue:</span>
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
              <span className="text-muted">Operating Costs:</span>
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
              <span className="text-muted">Loan Interest:</span>
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
              <span className="text-muted">CapEx Subsidy Grant:</span>
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
                    <span className="text-muted">Gross Revenue:</span>
                    <span className="font-bold text-foreground">
                      ₹{sc.monthlyGrossRevenue.toLocaleString('en-IN')}/mo
                    </span>
                  </div>

                  {/* Monthly OPEX */}
                  <div className="flex justify-between items-center py-1 border-b border-border-subtle">
                    <span className="text-muted">Operating Costs:</span>
                    <span className="font-semibold text-foreground">
                      ₹{sc.monthlyOperatingCosts.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Loan EMI */}
                  <div className="flex justify-between items-center py-1 border-b border-border-subtle">
                    <span className="text-muted">Loan EMI:</span>
                    <span className="font-semibold text-foreground">
                      ₹{sc.monthlyLoanEmi.toLocaleString('en-IN')}/mo
                    </span>
                  </div>

                  {/* Net Monthly Profit */}
                  <div className="p-2.5 rounded-xl bg-surface-elevated border border-border flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted block font-medium">Net Profit (PAT)</span>
                      <span className="text-[10px] text-muted font-bold">Margin: {sc.profitMarginPercent}%</span>
                    </div>
                    <span className={`text-sm font-black ${sc.monthlyNetProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {sc.monthlyNetProfit >= 0 ? '+' : ''}₹{sc.monthlyNetProfit.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Break Even */}
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted">Break-Even Period:</span>
                    <span className="font-bold text-foreground">
                      {sc.breakEvenMonths ? `${sc.breakEvenMonths} Months` : 'Unviable'}
                    </span>
                  </div>

                  {/* Bank DSCR */}
                  <div className="flex justify-between items-center text-[11px] pt-1">
                    <span className="text-muted">Bank DSCR Ratio:</span>
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
