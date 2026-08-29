'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import NumberBadge from '@/components/ui/NumberBadge';
import TextToSpeechButton from '@/components/ui/TextToSpeechButton';
import WhatIfComparator from '@/components/planner/WhatIfComparator';
import LocalBusinessContext from '@/components/planner/LocalBusinessContext';
import DocumentChecklist from '@/components/schemes/DocumentChecklist';
import { savePlan } from '@/lib/firestore/plans';
import { downloadPlanPdf } from '@/lib/pdf/export-plan-pdf';
import type { PlanInputs, CalculatedValues } from '@/types';

interface PlanResultViewProps {
  inputs: PlanInputs;
  calculated: CalculatedValues;
  narrative: {
    executiveSummary: string;
    keyAssumptions: string[];
    riskAnalysis: string[];
    actionableNextSteps: string[];
  };
  userId: string;
  onEdit: () => void;
}

export default function PlanResultView({
  inputs,
  calculated,
  narrative,
  userId,
  onEdit,
}: PlanResultViewProps) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleSavePlan = async () => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      const planTitle = `${inputs.businessType} Financial Viability Plan (${inputs.location})`;
      const id = await savePlan(userId, {
        userId,
        title: planTitle,
        businessType: inputs.businessType,
        inputs,
        calculatedValues: calculated,
        aiNarrative: narrative,
      });
      setSavedId(id);
      setToastMessage(`✅ ${t.planner.savedPlanToast}`);
    } catch (err) {
      console.error('Failed to save plan:', err);
      setToastMessage(`❌ ${t.errors.saveFailed}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      const cleanFileName = `ArthaSetu_${inputs.businessType.replace(/\s+/g, '_')}_Plan.pdf`;
      downloadPlanPdf({
        inputs,
        calculated,
        narrative,
      }, cleanFileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const speechNarrativeText = `
    Business Viability Plan for ${inputs.businessType} in ${inputs.location}.
    Total capital required is rupees ${calculated.totalInitialCost.toLocaleString('en-IN')}.
    Estimated bank funding gap is rupees ${calculated.fundingGap.toLocaleString('en-IN')}.
    Projected monthly net profit is rupees ${calculated.monthlyNetProfit.toLocaleString('en-IN')} with an operating margin of ${calculated.profitMarginPercent} percent.
    Executive summary: ${narrative.executiveSummary}.
  `;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast alert */}
      {toastMessage && (
        <div className="bg-success-light border border-success text-green-900 dark:text-green-200 px-4 py-3 rounded-2xl text-xs font-semibold text-center animate-fade-in flex items-center justify-between">
          <span>{toastMessage}</span>
          {savedId && (
            <Link href="/saved-plans" className="underline font-bold ml-2">
              {t.nav.savedPlans} →
            </Link>
          )}
        </div>
      )}

      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {inputs.businessType}
            </span>
            <span className="text-xs text-muted">📍 {inputs.location}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
            {t.planner.title} &amp; Viability Report
          </h1>
          <p className="text-xs text-muted mt-0.5">
            {t.planner.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <TextToSpeechButton text={speechNarrativeText} size="sm" label="Read Plan" />

          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            ← {t.planner.editInputs}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            isLoading={isExportingPdf}
            className="font-bold border-primary/40 text-primary hover:bg-primary/10"
          >
            📄 Bank-Ready PDF
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSavePlan}
            disabled={saving || !!savedId}
            isLoading={saving}
          >
            {savedId ? '✓ Saved' : `💾 ${t.planner.savePlan}`}
          </Button>
        </div>
      </div>

      {/* Hero Metrics Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <NumberBadge
          source="app-calculated"
          label={t.planner.totalInvestment}
          value={calculated.totalInitialCost}
          size="lg"
        />

        <NumberBadge
          source="app-calculated"
          label={t.planner.fundingGap}
          value={calculated.fundingGap}
          size="lg"
        />

        <NumberBadge
          source="app-calculated"
          label={t.planner.currentNetProfit}
          value={calculated.monthlyNetProfit}
          size="lg"
        />

        <NumberBadge
          source="app-calculated"
          label={t.planner.operatingMargin}
          value={calculated.profitMarginPercent}
          isCurrency={false}
          suffix="%"
          size="lg"
        />

        <NumberBadge
          source="app-calculated"
          label={t.planner.estimatedEmi}
          value={calculated.monthlyLoanEmi}
          size="md"
        />

        <NumberBadge
          source="app-calculated"
          label={t.planner.breakEven}
          value={calculated.breakEvenMonths ? calculated.breakEvenMonths : 'Loss'}
          isCurrency={false}
          suffix={calculated.breakEvenMonths ? ' Months' : ''}
          size="md"
        />

        <NumberBadge
          source="app-calculated"
          label="Break-Even Volume"
          value={calculated.breakEvenUnitsPerMonth}
          isCurrency={false}
          suffix=" units/mo"
          size="md"
        />

        <NumberBadge
          source="app-calculated"
          label="Annual Projected Profit"
          value={calculated.annualNetProfit}
          size="md"
        />
      </div>

      {/* AI Qualitative Narrative Box */}
      <Card padding="lg" className="space-y-6 border-saffron-300 dark:border-saffron-800 bg-surface-elevated shadow-lg">
        {/* Executive Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-saffron-500 text-white">
                ✨ AI Insight
              </span>
              <h2 className="text-base font-bold text-foreground">
                {t.planner.executiveSummary}
              </h2>
            </div>
            <TextToSpeechButton text={narrative.executiveSummary || ''} size="sm" />
          </div>
          <p className="text-sm text-muted leading-relaxed font-medium">
            {narrative.executiveSummary}
          </p>
        </div>

        {/* 3-Column AI Qualitative Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border-subtle">
          {/* Key Assumptions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <span>📌</span>
              <span>{t.planner.keyAssumptions}</span>
            </h3>
            <ul className="space-y-2">
              {narrative.keyAssumptions?.map((item, idx) => (
                <li key={idx} className="text-xs text-muted leading-relaxed flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risk Analysis & Mitigations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{t.planner.riskAnalysis}</span>
            </h3>
            <ul className="space-y-2">
              {narrative.riskAnalysis?.map((item, idx) => (
                <li key={idx} className="text-xs text-muted leading-relaxed flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actionable Next Steps */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <span>🚀</span>
              <span>{t.planner.nextSteps}</span>
            </h3>
            <ul className="space-y-2">
              {narrative.actionableNextSteps?.map((item, idx) => (
                <li key={idx} className="text-xs text-muted leading-relaxed flex items-start gap-2">
                  <span className="text-success font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Feature 4: What-If Scenario Comparator */}
      <WhatIfComparator inputs={inputs} calculated={calculated} />

      {/* Feature 6: AI-Estimated Local & Seasonal Business Context */}
      <LocalBusinessContext businessType={inputs.businessType} location={inputs.location} />

      {/* Financial Details Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Startup Investment Breakdown */}
        <Card padding="lg" className="space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>🏗️</span>
            <span>{inputs.planType === 'existing_expansion' ? t.planner.stepExpansionCapital : 'Investment Breakdown'}</span>
          </h2>

          <div className="space-y-2.5">
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Equipment & Machinery</span>
              <span className="font-bold text-foreground">₹{inputs.equipmentCost.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Shed / Shop Civil Setup</span>
              <span className="font-bold text-foreground">₹{inputs.setupCost.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Initial Stock / Batch Materials</span>
              <span className="font-bold text-foreground">₹{inputs.initialInventory.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Working Capital Safety Buffer</span>
              <span className="font-bold text-foreground">₹{inputs.workingCapitalReserve.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm font-bold border-t border-border">
              <span className="text-foreground">{t.planner.totalInvestment}</span>
              <span className="text-primary font-black">₹{calculated.totalInitialCost.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Card>

        {/* Monthly Cash Flow Structure */}
        <Card padding="lg" className="space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>🧾</span>
            <span>{t.planner.stepCurrentCashFlow}</span>
          </h2>

          <div className="space-y-2.5">
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">{t.planner.projectedMonthlyRevenue}</span>
              <span className="font-bold text-success">+ ₹{calculated.monthlyGrossRevenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Raw Materials Replenishment</span>
              <span className="font-bold text-danger">- ₹{inputs.monthlyRawMaterials.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Rent, Utilities & Electricity</span>
              <span className="font-bold text-danger">- ₹{inputs.monthlyRentUtilities.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Labor Wages</span>
              <span className="font-bold text-danger">- ₹{inputs.monthlyLabor.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Transport, Logistics & Maintenance</span>
              <span className="font-bold text-danger">- ₹{(inputs.monthlyTransportPackaging + inputs.monthlyMaintenanceOther).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">{t.planner.estimatedEmi}</span>
              <span className="font-bold text-danger">- ₹{calculated.monthlyLoanEmi.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm font-bold border-t border-border">
              <span className="text-foreground">{t.planner.projectedMonthlyNetProfit}</span>
              <span className="text-success font-black">₹{calculated.monthlyNetProfit.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Feature 2: Scheme Required Documents Checklist */}
      <DocumentChecklist />

      {/* Bottom CTA to Schemes */}
      <div className="p-6 rounded-3xl bg-surface-elevated border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground">
            Bridge your ₹{calculated.fundingGap.toLocaleString('en-IN')} {t.planner.fundingGap} with Subsidies
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Discover Central and State subsidy schemes (PMEGP, MUDRA, NLM) matching your profile in {inputs.location}.
          </p>
        </div>
        <Link href="/schemes" className="shrink-0">
          <Button size="md">
            {t.schemes.findSchemes} →
          </Button>
        </Link>
      </div>
    </div>
  );
}
