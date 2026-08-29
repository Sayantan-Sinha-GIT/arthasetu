'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import NumberBadge from '@/components/ui/NumberBadge';
import TextToSpeechButton from '@/components/ui/TextToSpeechButton';
import WhatIfComparator from '@/components/planner/WhatIfComparator';
import LocalBusinessContext from '@/components/planner/LocalBusinessContext';
import DocumentChecklist from '@/components/schemes/DocumentChecklist';
import SchemeCard from '@/components/schemes/SchemeCard';
import { savePlan } from '@/lib/firestore/plans';
import { getAllSchemes } from '@/lib/firestore/schemes';
import { matchSchemesForProfile } from '@/lib/schemes/matcher';
import { downloadPlanPdf } from '@/lib/pdf/export-plan-pdf';
import type { PlanInputs, CalculatedValues, SchemeMatchResult } from '@/types';

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
  const [matchedSchemes, setMatchedSchemes] = useState<SchemeMatchResult[]>([]);

  useEffect(() => {
    async function loadMatchedSchemes() {
      try {
        const allSchemes = await getAllSchemes();
        const matches = matchSchemesForProfile(allSchemes, {
          state: inputs.location,
          businessType: inputs.businessType,
          desiredFunding: calculated.fundingGap || calculated.totalInitialCost,
        });
        setMatchedSchemes(matches.slice(0, 3));
      } catch (err) {
        console.warn('Could not load matched schemes for plan view:', err);
      }
    }
    loadMatchedSchemes();
  }, [inputs.location, inputs.businessType, calculated.fundingGap, calculated.totalInitialCost]);

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

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await downloadPlanPdf({
        inputs,
        calculated,
        narrative,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-surface-elevated border border-primary/40 text-foreground text-sm font-semibold flex items-center justify-between shadow-lg animate-slide-up">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage('')}
            className="text-xs text-muted hover:text-foreground ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Plan Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {inputs.businessType}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
              {inputs.businessScale}
            </span>
          </div>
          <p className="text-muted text-xs sm:text-sm mt-1">
            📍 {inputs.location} • Generated for your enterprise scale
          </p>
        </div>

        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-xs"
          >
            ✏️ {t.planner.editInputs}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSavePlan}
            disabled={saving || !!savedId}
            className="text-xs"
          >
            {savedId ? '✓ Saved' : `💾 ${t.planner.savePlan}`}
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPdf}
            isLoading={isExportingPdf}
            className="text-xs bg-saffron-600 hover:bg-saffron-500 text-white font-bold"
          >
            📄 Export PDF
          </Button>
        </div>
      </div>

      {/* Key Numbers 4-Card Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <NumberBadge
          label={t.planner.totalInvestment}
          value={calculated.totalInitialCost}
          source="app-calculated"
        />
        <NumberBadge
          label="Available Savings"
          value={inputs.availableSavings}
          source="user-provided"
        />
        <NumberBadge
          label={t.planner.fundingGap}
          value={calculated.fundingGap}
          source="app-calculated"
        />
        <NumberBadge
          label={t.planner.projectedMonthlyNetProfit}
          value={calculated.monthlyNetProfit}
          source="app-calculated"
        />
      </div>

      {/* Break-Even Callout Card */}
      <Card padding="lg" className="border-saffron-500/30 bg-saffron-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-saffron-500/20 text-saffron-600 dark:text-saffron-300 flex items-center justify-center text-2xl font-bold shrink-0">
              ⚖️
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {t.planner.breakEven}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {calculated.breakEvenUnitsPerMonth ? `${calculated.breakEvenUnitsPerMonth.toLocaleString('en-IN')} units/month minimum production needed to cover fixed overheads.` : 'Estimated recovery timeframe'}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-2xl font-black text-foreground">
              {calculated.breakEvenMonths !== null ? `${calculated.breakEvenMonths} Months` : 'N/A'}
            </span>
            <span className="block text-[11px] text-muted font-medium">
              Estimated Capital Recovery
            </span>
          </div>
        </div>
      </Card>

      {/* Feature 1: What-If Scenario Comparator */}
      <WhatIfComparator calculated={calculated} inputs={inputs} />

      {/* Feature 3: Hyperlocal Cost Factors & Context */}
      <LocalBusinessContext location={inputs.location} businessType={inputs.businessType} />

      {/* AI Advisory Analysis Section */}
      <Card padding="lg" className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h2 className="text-base font-bold text-foreground">
              {t.advisor.title}
            </h2>
          </div>
          <TextToSpeechButton
            text={`${narrative.executiveSummary}. Key recommendations: ${narrative.actionableNextSteps.join('. ')}`}
            size="sm"
          />
        </div>

        {/* Executive Summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
            {t.planner.executiveSummary}
          </h3>
          <p className="text-sm text-foreground leading-relaxed bg-surface p-4 rounded-2xl border border-border-subtle">
            {narrative.executiveSummary}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key Assumptions */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <span>📌</span>
              <span>{t.planner.keyAssumptions}</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-muted">
              {narrative.keyAssumptions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-surface-elevated p-2.5 rounded-xl border border-border-subtle">
                  <span className="text-primary font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risk Analysis & Mitigations */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{t.planner.riskAnalysis}</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-muted">
              {narrative.riskAnalysis.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-surface-elevated p-2.5 rounded-xl border border-border-subtle">
                  <span className="text-danger font-bold">!</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actionable Next Steps */}
        <div className="space-y-2 pt-2 border-t border-border-subtle">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span>🚀</span>
            <span>{t.planner.nextSteps}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {narrative.actionableNextSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-surface border border-border text-xs text-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Cash Flow Breakdown Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Initial Capital Breakdown */}
        <Card padding="md" className="space-y-3">
          <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <span>🏗️</span>
            <span>{t.planner.stepInvestment}</span>
          </h2>

          <div className="space-y-2.5">
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Equipment & Machinery</span>
              <span className="font-bold text-foreground">₹{(inputs.equipmentCost || inputs.expansionEquipmentCost || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Setup & Shed</span>
              <span className="font-bold text-foreground">₹{(inputs.setupCost || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Initial Stock</span>
              <span className="font-bold text-foreground">₹{(inputs.initialInventory || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Working Capital</span>
              <span className="font-bold text-foreground">₹{(inputs.workingCapitalReserve || inputs.expansionWorkingCapital || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm font-bold border-t border-border">
              <span className="text-foreground">{t.planner.totalInvestment}</span>
              <span className="text-primary font-black">₹{calculated.totalInitialCost.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Card>

        {/* Monthly Operational Cash Flow */}
        <Card padding="md" className="space-y-3">
          <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <span>🧾</span>
            <span>{t.planner.stepCurrentCashFlow}</span>
          </h2>

          <div className="space-y-2.5">
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">{t.planner.projectedMonthlyRevenue}</span>
              <span className="font-bold text-success">+ ₹{calculated.monthlyGrossRevenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Raw Materials</span>
              <span className="font-bold text-danger">- ₹{inputs.monthlyRawMaterials.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Rent & Utilities</span>
              <span className="font-bold text-danger">- ₹{inputs.monthlyRentUtilities.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle text-xs">
              <span className="text-muted">Labor Wages</span>
              <span className="font-bold text-danger">- ₹{inputs.monthlyLabor.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm font-bold border-t border-border">
              <span className="text-foreground">{t.planner.projectedMonthlyNetProfit}</span>
              <span className="text-success font-black">₹{calculated.monthlyNetProfit.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Matched Government Schemes & Subsidies */}
      {matchedSchemes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h2 className="text-base font-bold text-foreground">
                Matched Government Subsidies & Schemes ({matchedSchemes.length})
              </h2>
            </div>
            <Link href="/schemes" className="text-xs text-primary font-bold hover:underline">
              {t.schemes.findSchemes} →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {matchedSchemes.map((match) => (
              <SchemeCard key={match.scheme.id} scheme={match.scheme} matchInfo={match} />
            ))}
          </div>
        </div>
      )}

      {/* Scheme Required Documents Checklist */}
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
