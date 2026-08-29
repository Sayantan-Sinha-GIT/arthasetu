'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Input, { NumberInput } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import NumberBadge from '@/components/ui/NumberBadge';
import { calculateFinancialPlan } from '@/lib/calculator';
import type { PlanInputs, UserProfile } from '@/types';

interface PlannerWizardProps {
  initialProfile: Partial<UserProfile> | null;
  onGeneratePlan: (inputs: PlanInputs) => void;
  isLoading: boolean;
}

export default function PlannerWizard({
  initialProfile,
  onGeneratePlan,
  isLoading,
}: PlannerWizardProps) {
  const { t, language } = useLanguage();

  const isExistingProfile = initialProfile?.businessStatus === 'existing';
  const [step, setStep] = useState(1);

  // Form State initialized with profile defaults
  const [inputs, setInputs] = useState<PlanInputs>({
    planType: isExistingProfile ? 'existing_expansion' : 'startup',
    businessType: initialProfile?.businessType || 'Broiler Poultry Farm',
    businessScale: isExistingProfile ? 'Existing Unit + 50% Expansion' : '500 birds per batch',
    location: initialProfile?.locality
      ? `${initialProfile.locality}, ${initialProfile?.state || ''}`
      : initialProfile?.state || 'Kamrup, Assam',
    
    // Existing business defaults
    currentMonthlyRevenue: initialProfile?.monthlyIncome || 35000,
    currentMonthlyExpenses: initialProfile?.monthlyExpenses || 20000,
    expansionGoal: 'Expand capacity with new automated feeding & larger shed',
    expansionEquipmentCost: 40000,
    expansionWorkingCapital: 20000,
    projectedRevenueIncreasePercent: 40,

    // Startup defaults
    equipmentCost: 25000,
    setupCost: 35000,
    initialInventory: 15000,
    workingCapitalReserve: 15000,

    unitPrice: 160,
    unitsSoldPerMonth: 450,
    otherMonthlyRevenue: 2000,

    monthlyRawMaterials: 35000,
    monthlyRentUtilities: 3000,
    monthlyLabor: 5000,
    monthlyTransportPackaging: 2500,
    monthlyMaintenanceOther: 1500,

    availableSavings: initialProfile?.availableCapital || 30000,
    loanInterestRatePercent: 9.5,
    loanTenureMonths: 36,
  });

  const updateField = <K extends keyof PlanInputs>(field: K, value: PlanInputs[K]) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const isExisting = inputs.planType === 'existing_expansion';

  // Real-time live deterministic calculations for the sidebar summary
  const liveCalculated = calculateFinancialPlan(inputs);

  const stepsList = isExisting
    ? [
        { num: 1, title: t.planner.stepBusiness, icon: '🏢' },
        { num: 2, title: t.planner.stepCurrentCashFlow, icon: '💰' },
        { num: 3, title: t.planner.stepExpansionCapital, icon: '🏗️' },
        { num: 4, title: t.planner.stepProjectedGrowth, icon: '📈' },
        { num: 5, title: t.planner.stepFundingGap, icon: '🏦' },
      ]
    : [
        { num: 1, title: t.planner.stepBusiness, icon: '🏢' },
        { num: 2, title: t.planner.stepInvestment, icon: '🏗️' },
        { num: 3, title: t.planner.stepRevenue, icon: '📈' },
        { num: 4, title: t.planner.stepExpenses, icon: '🧾' },
        { num: 5, title: t.planner.stepFunding, icon: '🏦' },
      ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left / Main Wizard Area */}
      <div className="lg:col-span-8 space-y-6">
        {/* Step Indicator Pills */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b border-border">
          {stepsList.map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num)}
              className={`
                flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0
                ${step === s.num
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : step > s.num
                  ? 'bg-surface-elevated text-success border border-success/30'
                  : 'bg-surface text-muted hover:text-foreground'
                }
              `}
            >
              <span>{s.icon}</span>
              <span>{s.num}. {s.title}</span>
              {step > s.num && <span className="text-[10px]">✓</span>}
            </button>
          ))}
        </div>

        {/* STEP 1: BUSINESS CONTEXT & PLANNING MODE */}
        {step === 1 && (
          <Card padding="lg" className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>🏢</span>
                <span>Step 1: Business Context & Planning Mode</span>
              </h2>
              <p className="text-xs text-muted mt-1">
                Choose whether you are starting fresh or expanding an existing profitable business
              </p>
            </div>

            {/* Mode Switcher Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => updateField('planType', 'startup')}
                className={`
                  p-4 rounded-2xl border text-left transition-all
                  ${!isExisting
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border bg-surface hover:bg-surface-elevated text-muted'
                  }
                `}
              >
                <div className="text-xl mb-1">🌱</div>
                <h4 className="text-sm font-bold text-foreground">New Startup Plan</h4>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Starting a new venture from scratch with initial machinery, shed, and initial stock.
                </p>
              </button>

              <button
                type="button"
                onClick={() => updateField('planType', 'existing_expansion')}
                className={`
                  p-4 rounded-2xl border text-left transition-all
                  ${isExisting
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border bg-surface hover:bg-surface-elevated text-muted'
                  }
                `}
              >
                <div className="text-xl mb-1">🚀</div>
                <h4 className="text-sm font-bold text-foreground">Existing Business Expansion</h4>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Start from current monthly revenue & expenses to calculate growth capital needs.
                </p>
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <Input
                label="Business Type / Activity"
                value={inputs.businessType}
                onChange={(e) => updateField('businessType', e.target.value)}
                placeholder="e.g. Broiler Poultry Farm, Tailoring Shop, Dairy Unit"
                required
              />

              <Input
                label="Target Capacity / Operating Scale"
                value={inputs.businessScale}
                onChange={(e) => updateField('businessScale', e.target.value)}
                placeholder="e.g. 500 birds per batch, 8 Sewing machines, 5 Dairy cows"
                required
              />

              <Input
                label="Operating Location (Village / District / State)"
                value={inputs.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g. Hajo, Kamrup, Assam"
                required
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-border-subtle">
              <Button type="button" size="md" onClick={() => setStep(2)}>
                Next: {isExisting ? 'Current Cash Flow' : 'Startup Investment'} →
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 2: STARTUP INVESTMENT OR CURRENT CASH FLOW */}
        {step === 2 && (
          <Card padding="lg" className="space-y-5 animate-fade-in">
            {isExisting ? (
              <>
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>💰</span>
                    <span>Step 2: Current Operating Cash Flow</span>
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    Enter your current monthly sales and recurring costs before expansion
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput
                    label="Current Monthly Revenue / Sales (₹)"
                    value={inputs.currentMonthlyRevenue}
                    onChange={(e) => updateField('currentMonthlyRevenue', Number(e.target.value) || 0)}
                    placeholder="e.g. 35000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label="Current Monthly Expenses (₹)"
                    value={inputs.currentMonthlyExpenses}
                    onChange={(e) => updateField('currentMonthlyExpenses', Number(e.target.value) || 0)}
                    placeholder="e.g. 20000"
                    min={0}
                    required
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between text-xs">
                  <span className="text-muted font-medium">Current Baseline Monthly Profit:</span>
                  <span className="font-bold text-foreground text-sm">
                    ₹{((inputs.currentMonthlyRevenue || 0) - (inputs.currentMonthlyExpenses || 0)).toLocaleString('en-IN')}/mo
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>🏗️</span>
                    <span>Step 2: Startup Capital & Initial Investment</span>
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    Enter your one-time initial setup and equipment purchases
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput
                    label="Equipment & Machinery (₹)"
                    value={inputs.equipmentCost}
                    onChange={(e) => updateField('equipmentCost', Number(e.target.value) || 0)}
                    placeholder="e.g. 25000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label="Shed, Shop Setup & Civil Works (₹)"
                    value={inputs.setupCost}
                    onChange={(e) => updateField('setupCost', Number(e.target.value) || 0)}
                    placeholder="e.g. 35000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label="Initial Stock / First Batch Raw Material (₹)"
                    value={inputs.initialInventory}
                    onChange={(e) => updateField('initialInventory', Number(e.target.value) || 0)}
                    placeholder="e.g. 15000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label="Working Capital Reserve Buffer (₹)"
                    value={inputs.workingCapitalReserve}
                    onChange={(e) => updateField('workingCapitalReserve', Number(e.target.value) || 0)}
                    placeholder="e.g. 15000"
                    min={0}
                    required
                  />
                </div>
              </>
            )}

            <div className="flex justify-between pt-4 border-t border-border-subtle">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button type="button" onClick={() => setStep(3)}>
                Next: {isExisting ? 'Expansion Capital' : 'Revenue Model'} →
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 3: REVENUE MODEL OR EXPANSION CAPITAL */}
        {step === 3 && (
          <Card padding="lg" className="space-y-5 animate-fade-in">
            {isExisting ? (
              <>
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>🏗️</span>
                    <span>Step 3: Growth Capital & Expansion Assets Needed</span>
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    What new assets or working capital do you need to expand operations?
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Expansion Goal / Purpose"
                    value={inputs.expansionGoal}
                    onChange={(e) => updateField('expansionGoal', e.target.value)}
                    placeholder="e.g. Purchase automated packaging unit and expand shed"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NumberInput
                      label="New Machinery / Asset Purchases (₹)"
                      value={inputs.expansionEquipmentCost}
                      onChange={(e) => updateField('expansionEquipmentCost', Number(e.target.value) || 0)}
                      placeholder="e.g. 40000"
                      min={0}
                      required
                    />

                    <NumberInput
                      label="Additional Working Capital / Stock (₹)"
                      value={inputs.expansionWorkingCapital}
                      onChange={(e) => updateField('expansionWorkingCapital', Number(e.target.value) || 0)}
                      placeholder="e.g. 20000"
                      min={0}
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>📈</span>
                    <span>Step 3: Unit Sales & Monthly Revenue Model</span>
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    Estimate monthly unit pricing and sales volume
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput
                    label="Price per Finished Unit / Service (₹)"
                    value={inputs.unitPrice}
                    onChange={(e) => updateField('unitPrice', Number(e.target.value) || 0)}
                    placeholder="e.g. 160"
                    min={0}
                    required
                  />

                  <NumberInput
                    label="Estimated Units Sold per Month"
                    value={inputs.unitsSoldPerMonth}
                    onChange={(e) => updateField('unitsSoldPerMonth', Number(e.target.value) || 0)}
                    placeholder="e.g. 450"
                    min={0}
                    required
                  />

                  <NumberInput
                    label="Secondary / Byproduct Revenue (₹/month)"
                    value={inputs.otherMonthlyRevenue}
                    onChange={(e) => updateField('otherMonthlyRevenue', Number(e.target.value) || 0)}
                    placeholder="e.g. 2000"
                    min={0}
                  />
                </div>
              </>
            )}

            <div className="flex justify-between pt-4 border-t border-border-subtle">
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <Button type="button" onClick={() => setStep(4)}>
                Next: {isExisting ? 'Projected Growth' : 'Operating Expenses'} →
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 4: EXPENSES OR PROJECTED GROWTH */}
        {step === 4 && (
          <Card padding="lg" className="space-y-5 animate-fade-in">
            {isExisting ? (
              <>
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>📈</span>
                    <span>Step 4: Projected Post-Expansion Growth</span>
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    Estimate your revenue surge and expanded operating capacity
                  </p>
                </div>

                <div className="space-y-4">
                  <NumberInput
                    label="Expected Revenue Increase (% Growth)"
                    value={inputs.projectedRevenueIncreasePercent}
                    onChange={(e) => updateField('projectedRevenueIncreasePercent', Number(e.target.value) || 0)}
                    placeholder="e.g. 40"
                    min={5}
                    max={300}
                    required
                  />

                  <div className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">Projected Monthly Revenue:</span>
                      <span className="font-bold text-foreground">₹{liveCalculated.monthlyGrossRevenue.toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Projected Operating Expenses:</span>
                      <span className="font-bold text-foreground">₹{liveCalculated.monthlyOperatingExpenses.toLocaleString('en-IN')}/mo</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>🧾</span>
                    <span>Step 4: Monthly Operating Expenses (OPEX)</span>
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    Recurring monthly costs needed to produce and distribute goods
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput
                    label="Raw Materials / Feed / Inputs (₹/month)"
                    value={inputs.monthlyRawMaterials}
                    onChange={(e) => updateField('monthlyRawMaterials', Number(e.target.value) || 0)}
                    placeholder="e.g. 35000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label="Rent & Utilities (Power, Water) (₹/month)"
                    value={inputs.monthlyRentUtilities}
                    onChange={(e) => updateField('monthlyRentUtilities', Number(e.target.value) || 0)}
                    placeholder="e.g. 3000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label="Direct Labor / Helpers (₹/month)"
                    value={inputs.monthlyLabor}
                    onChange={(e) => updateField('monthlyLabor', Number(e.target.value) || 0)}
                    placeholder="e.g. 5000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label="Transport, Logistics & Packaging (₹/month)"
                    value={inputs.monthlyTransportPackaging}
                    onChange={(e) => updateField('monthlyTransportPackaging', Number(e.target.value) || 0)}
                    placeholder="e.g. 2500"
                    min={0}
                    required
                  />

                  <NumberInput
                    label="Maintenance, Marketing & Other (₹/month)"
                    value={inputs.monthlyMaintenanceOther}
                    onChange={(e) => updateField('monthlyMaintenanceOther', Number(e.target.value) || 0)}
                    placeholder="e.g. 1500"
                    min={0}
                    required
                  />
                </div>
              </>
            )}

            <div className="flex justify-between pt-4 border-t border-border-subtle">
              <Button type="button" variant="ghost" onClick={() => setStep(3)}>
                ← Back
              </Button>
              <Button type="button" onClick={() => setStep(5)}>
                Next: Funding & Review →
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 5: FUNDING GAP & FINAL REVIEW */}
        {step === 5 && (
          <Card padding="lg" className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>🏦</span>
                <span>Step 5: Funding Gap, Loan Assumptions & Review</span>
              </h2>
              <p className="text-xs text-muted mt-1">
                Calculate your net funding requirement and generate the complete plan
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <NumberInput
                label="Your Available Own Capital (₹)"
                value={inputs.availableSavings}
                onChange={(e) => updateField('availableSavings', Number(e.target.value) || 0)}
                placeholder="e.g. 30000"
                min={0}
                required
              />

              <NumberInput
                label="Annual Loan Interest Rate (%)"
                value={inputs.loanInterestRatePercent}
                onChange={(e) => updateField('loanInterestRatePercent', Number(e.target.value) || 0)}
                placeholder="e.g. 9.5"
                min={0}
                max={25}
                required
              />

              <NumberInput
                label="Loan Tenure (Months)"
                value={inputs.loanTenureMonths}
                onChange={(e) => updateField('loanTenureMonths', Number(e.target.value) || 0)}
                placeholder="e.g. 36"
                min={6}
                max={120}
                required
              />
            </div>

            {/* Review Summary Box */}
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Calculated Plan Summary (Deterministic Math)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted block">Total {isExisting ? 'Expansion' : 'Initial'} Cost</span>
                  <span className="font-bold text-foreground text-sm">₹{liveCalculated.totalInitialCost.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-muted block">Funding Gap Needed</span>
                  <span className="font-bold text-saffron-600 text-sm">₹{liveCalculated.fundingGap.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-muted block">Monthly Loan EMI</span>
                  <span className="font-bold text-foreground text-sm">₹{liveCalculated.monthlyLoanEmi.toLocaleString('en-IN')}/mo</span>
                </div>
                <div>
                  <span className="text-muted block">Projected Monthly Net Profit</span>
                  <span className="font-bold text-success text-sm">₹{liveCalculated.monthlyNetProfit.toLocaleString('en-IN')}/mo</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border-subtle">
              <Button type="button" variant="ghost" onClick={() => setStep(4)}>
                ← Back
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={() => onGeneratePlan(inputs)}
                isLoading={isLoading}
                className="px-8 shadow-lg"
              >
                Generate Complete Plan with AI Insights ✨
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Right Sidebar: Real-Time Deterministic Calculation Summary */}
      <div className="lg:col-span-4 space-y-4">
        <Card padding="md" className="space-y-4 sticky top-24">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>🧮</span>
              <span>Live Plan Metrics</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              ⚙️ App Math
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted">Total {isExisting ? 'Expansion' : 'Initial'} Capital:</span>
              <span className="font-bold text-foreground">₹{liveCalculated.totalInitialCost.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted">Own Capital:</span>
              <span className="font-medium text-foreground">₹{(inputs.availableSavings || 0).toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
              <span className="text-muted font-bold">Funding Gap (Loan):</span>
              <span className="font-bold text-saffron-600">₹{liveCalculated.fundingGap.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted">Monthly EMI:</span>
              <span className="font-semibold text-foreground">₹{liveCalculated.monthlyLoanEmi.toLocaleString('en-IN')}/mo</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
              <span className="text-muted">Gross Monthly Revenue:</span>
              <span className="font-semibold text-foreground">₹{liveCalculated.monthlyGrossRevenue.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted">Operating Expenses (OPEX):</span>
              <span className="font-semibold text-foreground">₹{liveCalculated.monthlyOperatingExpenses.toLocaleString('en-IN')}</span>
            </div>

            <div className="p-3 rounded-xl bg-success-light dark:bg-success-light/20 border border-success/30 flex justify-between items-center">
              <div>
                <span className="text-success font-bold block text-[11px]">Monthly Net Profit</span>
                <span className="text-[10px] text-muted">Margin: {liveCalculated.profitMarginPercent}%</span>
              </div>
              <span className="text-success font-black text-sm">
                ₹{liveCalculated.monthlyNetProfit.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-muted">
              <span>Break-Even Payback Period:</span>
              <span className="font-bold text-foreground">
                {liveCalculated.breakEvenMonths ? `${liveCalculated.breakEvenMonths} Months` : 'N/A'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
