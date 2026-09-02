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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const initialLocation = initialProfile?.locality
    ? `${initialProfile.locality}${initialProfile?.district ? `, ${initialProfile.district}` : ''}${initialProfile?.state ? `, ${initialProfile.state}` : ''}`
    : initialProfile?.district && initialProfile?.state
    ? `${initialProfile.district}, ${initialProfile.state}`
    : initialProfile?.state || '';

  // Form State initialized purely from profile (NO hardcoded fake demo numbers)
  const [inputs, setInputs] = useState<PlanInputs>({
    planType: isExistingProfile ? 'existing_expansion' : 'startup',
    businessType: initialProfile?.businessType || '',
    businessScale: '',
    location: initialLocation,
    
    // Existing business defaults from real profile
    currentMonthlyRevenue: initialProfile?.monthlyIncome || 0,
    currentMonthlyExpenses: initialProfile?.monthlyExpenses || 0,
    expansionGoal: '',
    expansionEquipmentCost: 0,
    expansionWorkingCapital: 0,
    projectedRevenueIncreasePercent: 0,

    // Startup defaults
    equipmentCost: 0,
    setupCost: 0,
    initialInventory: 0,
    workingCapitalReserve: 0,

    unitPrice: 0,
    unitsSoldPerMonth: 0,
    otherMonthlyRevenue: 0,

    monthlyRawMaterials: 0,
    monthlyRentUtilities: 0,
    monthlyLabor: 0,
    monthlyTransportPackaging: 0,
    monthlyMaintenanceOther: 0,

    availableSavings: initialProfile?.availableCapital || 0,
    loanInterestRatePercent: 9.5,
    loanTenureMonths: 36,
  });

  const updateField = <K extends keyof PlanInputs>(field: K, value: PlanInputs[K]) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!inputs.businessType?.trim()) {
      errs.businessType = t.planner.wizard.errBusinessType;
    }
    if (!inputs.location?.trim()) {
      errs.location = t.planner.wizard.errLocation;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGenerate = () => {
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    onGeneratePlan(inputs);
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
                <span>{t.planner.wizard.step1Title}</span>
              </h2>
              <p className="text-xs text-muted mt-1">
                {t.planner.wizard.step1Desc}
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
                <h4 className="text-sm font-bold text-foreground">{t.planner.newStartupPlan}</h4>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {t.planner.wizard.startupDesc}
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
                <h4 className="text-sm font-bold text-foreground">{t.planner.existingExpansion}</h4>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {t.planner.wizard.expansionDesc}
                </p>
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <Input
                label={t.planner.wizard.businessTypeLabel}
                value={inputs.businessType}
                onChange={(e) => updateField('businessType', e.target.value)}
                placeholder={t.planner.wizard.businessTypePlaceholder}
                error={errors.businessType}
                required
              />

              <Input
                label={t.planner.wizard.businessScaleLabel}
                value={inputs.businessScale}
                onChange={(e) => updateField('businessScale', e.target.value)}
                placeholder={t.planner.wizard.businessScalePlaceholder}
              />

              <Input
                label={t.planner.wizard.locationLabel}
                value={inputs.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder={t.planner.wizard.locationPlaceholder}
                error={errors.location}
                required
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-border-subtle">
              <Button
                type="button"
                size="md"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
              >
                {isExisting ? t.planner.wizard.nextCurrentCashFlow : t.planner.wizard.nextStartupInvestment}
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
                    <span>{t.planner.wizard.step2CurrentCashFlowTitle}</span>
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    {t.planner.wizard.step2CurrentCashFlowDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput
                    label={t.planner.wizard.currentMonthlyRevenue}
                    value={inputs.currentMonthlyRevenue}
                    onValueChange={(val) => updateField('currentMonthlyRevenue', val)}
                    placeholder="e.g. 35000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label={t.planner.wizard.currentMonthlyExpenses}
                    value={inputs.currentMonthlyExpenses}
                    onValueChange={(val) => updateField('currentMonthlyExpenses', val)}
                    placeholder="e.g. 20000"
                    min={0}
                    required
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between text-xs">
                  <span className="text-muted font-medium">{t.planner.wizard.currentBaselineProfit}</span>
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
                    <span>{t.planner.wizard.step2StartupTitle}</span>
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    {t.planner.wizard.step2StartupDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput
                    label={t.planner.wizard.equipmentCost}
                    value={inputs.equipmentCost}
                    onValueChange={(val) => updateField('equipmentCost', val)}
                    placeholder="e.g. 25000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label={t.planner.wizard.setupCost}
                    value={inputs.setupCost}
                    onValueChange={(val) => updateField('setupCost', val)}
                    placeholder="e.g. 35000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label={t.planner.wizard.initialInventory}
                    value={inputs.initialInventory}
                    onValueChange={(val) => updateField('initialInventory', val)}
                    placeholder="e.g. 15000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label={t.planner.wizard.workingCapitalReserve}
                    value={inputs.workingCapitalReserve}
                    onValueChange={(val) => updateField('workingCapitalReserve', val)}
                    placeholder="e.g. 15000"
                    min={0}
                    required
                  />
                </div>
              </>
            )}

            <div className="flex justify-between pt-4 border-t border-border-subtle">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                {t.planner.wizard.back}
              </Button>
              <Button type="button" onClick={() => setStep(3)}>
                {isExisting ? t.planner.wizard.nextExpansionCapital : t.planner.wizard.nextRevenueModel}
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
                    <span>{t.planner.wizard.step3ExpansionTitle}</span>
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    {t.planner.wizard.step3ExpansionDesc}
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    label={t.planner.wizard.expansionGoal}
                    value={inputs.expansionGoal}
                    onChange={(e) => updateField('expansionGoal', e.target.value)}
                    placeholder={t.planner.wizard.expansionGoalPlaceholder}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NumberInput
                      label={t.planner.wizard.newMachineryCost}
                      value={inputs.expansionEquipmentCost}
                      onValueChange={(val) => updateField('expansionEquipmentCost', val)}
                      placeholder="e.g. 40000"
                      min={0}
                      required
                    />

                    <NumberInput
                      label={t.planner.wizard.additionalWorkingCapital}
                      value={inputs.expansionWorkingCapital}
                      onValueChange={(val) => updateField('expansionWorkingCapital', val)}
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
                    <span>{t.planner.wizard.step3RevenueTitle}</span>
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    {t.planner.wizard.step3RevenueDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput
                    label={t.planner.wizard.unitPrice}
                    value={inputs.unitPrice}
                    onValueChange={(val) => updateField('unitPrice', val)}
                    placeholder="e.g. 160"
                    min={0}
                    required
                  />

                  <NumberInput
                    label={t.planner.wizard.unitsSoldPerMonth}
                    value={inputs.unitsSoldPerMonth}
                    onValueChange={(val) => updateField('unitsSoldPerMonth', val)}
                    placeholder="e.g. 450"
                    min={0}
                    required
                  />

                  <NumberInput
                    label={t.planner.wizard.otherMonthlyRevenue}
                    value={inputs.otherMonthlyRevenue}
                    onValueChange={(val) => updateField('otherMonthlyRevenue', val)}
                    placeholder="e.g. 2000"
                    min={0}
                  />
                </div>
              </>
            )}

            <div className="flex justify-between pt-4 border-t border-border-subtle">
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                {t.planner.wizard.back}
              </Button>
              <Button type="button" onClick={() => setStep(4)}>
                {isExisting ? t.planner.wizard.nextProjectedGrowth : t.planner.wizard.nextOperatingExpenses}
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
                    <span>{t.planner.wizard.step4GrowthTitle}</span>
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    {t.planner.wizard.step4GrowthDesc}
                  </p>
                </div>

                <div className="space-y-4">
                  <NumberInput
                    label={t.planner.wizard.expectedRevenueIncrease}
                    value={inputs.projectedRevenueIncreasePercent}
                    onValueChange={(val) => updateField('projectedRevenueIncreasePercent', val)}
                    placeholder="e.g. 40"
                    min={5}
                    max={300}
                    required
                  />

                  <div className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">{t.planner.wizard.projectedMonthlyRevenue}</span>
                      <span className="font-bold text-foreground">₹{liveCalculated.monthlyGrossRevenue.toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">{t.planner.wizard.projectedOperatingExpenses}</span>
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
                    <span>{t.planner.wizard.step4ExpensesTitle}</span>
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    {t.planner.wizard.step4ExpensesDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput
                    label={t.planner.wizard.rawMaterials}
                    value={inputs.monthlyRawMaterials}
                    onValueChange={(val) => updateField('monthlyRawMaterials', val)}
                    placeholder="e.g. 35000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label={t.planner.wizard.rentUtilities}
                    value={inputs.monthlyRentUtilities}
                    onValueChange={(val) => updateField('monthlyRentUtilities', val)}
                    placeholder="e.g. 3000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label={t.planner.wizard.labor}
                    value={inputs.monthlyLabor}
                    onValueChange={(val) => updateField('monthlyLabor', val)}
                    placeholder="e.g. 5000"
                    min={0}
                    required
                  />

                  <NumberInput
                    label={t.planner.wizard.transportPackaging}
                    value={inputs.monthlyTransportPackaging}
                    onValueChange={(val) => updateField('monthlyTransportPackaging', val)}
                    placeholder="e.g. 2500"
                    min={0}
                    required
                  />

                  <NumberInput
                    label={t.planner.wizard.maintenanceOther}
                    value={inputs.monthlyMaintenanceOther}
                    onValueChange={(val) => updateField('monthlyMaintenanceOther', val)}
                    placeholder="e.g. 1500"
                    min={0}
                    required
                  />
                </div>
              </>
            )}

            <div className="flex justify-between pt-4 border-t border-border-subtle">
              <Button type="button" variant="ghost" onClick={() => setStep(3)}>
                {t.planner.wizard.back}
              </Button>
              <Button type="button" onClick={() => setStep(5)}>
                {t.planner.wizard.nextFundingReview}
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
                <span>{t.planner.wizard.step5ReviewTitle}</span>
              </h2>
              <p className="text-xs text-muted mt-1">
                {t.planner.wizard.step5ReviewDesc}
              </p>
            </div>

            {/* 1. Own Capital Input */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-medium">{isExisting ? t.planner.wizard.totalExpansionCapital : t.planner.wizard.totalInitialCapital}</span>
                  <span className="font-bold text-foreground text-sm">₹{liveCalculated.totalInitialCost.toLocaleString('en-IN')}</span>
                </div>

                <NumberInput
                  label={t.planner.wizard.ownCapital}
                  value={inputs.availableSavings}
                  onValueChange={(val) => updateField('availableSavings', val)}
                  placeholder="e.g. 30000"
                  min={0}
                  required
                />

                <div className="flex justify-between items-center pt-2 border-t border-border-subtle text-xs">
                  <span className="text-muted font-bold">{t.planner.wizard.fundingGapBridge}</span>
                  <span className={`font-black text-sm ${liveCalculated.fundingGap > 0 ? 'text-saffron-600' : 'text-success'}`}>
                    ₹{liveCalculated.fundingGap.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* 2. Loan Options if Gap > 0 */}
              {liveCalculated.fundingGap > 0 && (
                <div className="space-y-4 p-4 rounded-2xl bg-surface-elevated border border-border">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-foreground">
                      {t.planner.wizard.planBankLoanPrompt.replace('{{gap}}', liveCalculated.fundingGap.toLocaleString('en-IN'))}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (inputs.loanInterestRatePercent === 0) updateField('loanInterestRatePercent', 9.5);
                          if (inputs.loanTenureMonths === 0) updateField('loanTenureMonths', 36);
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          inputs.loanInterestRatePercent > 0
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-surface text-muted'
                        }`}
                      >
                        {t.planner.wizard.yesBankLoan}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateField('loanInterestRatePercent', 0);
                          updateField('loanTenureMonths', 0);
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          inputs.loanInterestRatePercent === 0
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-surface text-muted'
                        }`}
                      >
                        {t.planner.wizard.noSubsidies}
                      </button>
                    </div>
                  </div>

                  {inputs.loanInterestRatePercent > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <NumberInput
                        label={t.planner.wizard.annualInterestRate}
                        value={inputs.loanInterestRatePercent}
                        onValueChange={(val) => updateField('loanInterestRatePercent', val)}
                        placeholder="e.g. 9.5"
                        min={0}
                        max={25}
                        required
                      />

                      <NumberInput
                        label={t.planner.wizard.loanTenure}
                        value={inputs.loanTenureMonths}
                        onValueChange={(val) => updateField('loanTenureMonths', val)}
                        placeholder="e.g. 36"
                        min={6}
                        max={120}
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 3. Deterministic Financial Sanity Warning (>12x monthly profit or negative) */}
              {liveCalculated.fundingGap > 0 &&
                (liveCalculated.monthlyNetProfit <= 0 ||
                  liveCalculated.fundingGap > 12 * liveCalculated.monthlyNetProfit) && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1.5 animate-slide-up">
                    <div className="flex items-center gap-2 font-bold">
                      <span>⚠️</span>
                      <span>{t.planner.feasibilityNotice}</span>
                    </div>
                    <p className="leading-relaxed">
                      {t.planner.wizard.feasibilityWarning.replace('{{gap}}', liveCalculated.fundingGap.toLocaleString('en-IN')).replace('{{profit}}', liveCalculated.monthlyNetProfit.toLocaleString('en-IN'))}
                    </p>
                  </div>
                )}
            </div>

            {/* Review Summary Box */}
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                {t.planner.wizard.calculatedSummary}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted block">{t.planner.totalCost}</span>
                  <span className="font-bold text-foreground text-sm">₹{liveCalculated.totalInitialCost.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-muted block">{t.planner.fundingGap_alt}</span>
                  <span className="font-bold text-saffron-600 text-sm">₹{liveCalculated.fundingGap.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-muted block">{t.planner.monthlyLoanEmi}</span>
                  <span className="font-bold text-foreground text-sm">₹{liveCalculated.monthlyLoanEmi.toLocaleString('en-IN')}/mo</span>
                </div>
                <div>
                  <span className="text-muted block">{t.planner.projectedNetProfit}</span>
                  <span className="font-bold text-success text-sm">₹{liveCalculated.monthlyNetProfit.toLocaleString('en-IN')}/mo</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border-subtle">
              <Button type="button" variant="ghost" onClick={() => setStep(4)}>
                {t.planner.wizard.back}
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={handleGenerate}
                isLoading={isLoading}
                className="px-8 shadow-lg font-bold"
              >
                {t.planner.wizard.generatePlanBtn}
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
              <span>{t.planner.wizard.liveMetricsTitle}</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              {t.planner.wizard.appMathBadge}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted">{t.planner.wizard.totalCapitalLabel}</span>
              <span className="font-bold text-foreground">₹{liveCalculated.totalInitialCost.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted">{t.planner.wizard.ownCapitalLabel}</span>
              <span className="font-medium text-foreground">₹{(inputs.availableSavings || 0).toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
              <span className="text-muted font-bold">{t.planner.wizard.fundingGapLabel}</span>
              <span className="font-bold text-saffron-600">₹{liveCalculated.fundingGap.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted">{t.planner.wizard.monthlyEmiLabel}</span>
              <span className="font-semibold text-foreground">₹{liveCalculated.monthlyLoanEmi.toLocaleString('en-IN')}/mo</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
              <span className="text-muted">{t.planner.wizard.grossMonthlyRevenueLabel}</span>
              <span className="font-semibold text-foreground">₹{liveCalculated.monthlyGrossRevenue.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted">{t.planner.wizard.opexLabel}</span>
              <span className="font-semibold text-foreground">₹{liveCalculated.monthlyOperatingExpenses.toLocaleString('en-IN')}</span>
            </div>

            <div className="p-3 rounded-xl bg-success-light dark:bg-success-light/20 border border-success/30 flex justify-between items-center">
              <div>
                <span className="text-success font-bold block text-[11px]">{t.planner.wizard.monthlyNetProfitLabel}</span>
                <span className="text-[10px] text-muted">{t.planner.wizard.marginLabel.replace('{{percent}}', liveCalculated.profitMarginPercent.toString())}</span>
              </div>
              <span className="text-success font-black text-sm">
                ₹{liveCalculated.monthlyNetProfit.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-muted">
              <span>{t.planner.wizard.breakEvenLabel}</span>
              <span className="font-bold text-foreground">
                {liveCalculated.breakEvenMonths ? `${liveCalculated.breakEvenMonths} ${t.planner.wizard.months}` : t.planner.wizard.na}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
