'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateGraminScore, GRAMIN_DISCLAIMER } from '@/lib/gramin-score';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import TextToSpeechButton from '@/components/ui/TextToSpeechButton';
import CountUp from '@/components/ui/CountUp';
import type { UserProfile, GraminScoreInputs, ExistingLoanInput } from '@/types';

interface GraminScoreCardProps {
  profile: Partial<UserProfile> | null;
}

export default function GraminScoreCard({ profile }: GraminScoreCardProps) {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);

  // Derive initial inputs from profile
  const [inputs, setInputs] = useState<GraminScoreInputs>(() => {
    const profileLoans: ExistingLoanInput[] =
      profile?.loanDetails && profile.loanDetails.length > 0
        ? profile.loanDetails.map((l) => ({
            id: l.id,
            lenderType: l.lenderType === 'informal' ? 'informal_moneylender' : l.lenderType,
            emiAmount: l.monthlyEmi || 0,
            status: 'on_time' as const,
          }))
        : [];

    return {
      monthlyIncome: typeof profile?.monthlyIncome === 'number' ? profile.monthlyIncome : 0,
      monthlyExpenses: typeof profile?.monthlyExpenses === 'number' ? profile.monthlyExpenses : 0,
      revenueConsistency: profile?.monthlyIncome && profile.monthlyIncome > 0 ? 'stable' : 'growing',
      steadyIncomeMonths: profile?.businessStatus === 'existing' ? 12 : 0,
      availableCapital: typeof profile?.availableCapital === 'number' ? profile.availableCapital : 0,
      desiredFunding: typeof profile?.desiredFunding === 'number' ? profile.desiredFunding : 0,
      monthlySavings: typeof profile?.monthlyIncome === 'number' && typeof profile?.monthlyExpenses === 'number'
        ? Math.max(0, profile.monthlyIncome - profile.monthlyExpenses)
        : 0,
      emergencyReserve: typeof profile?.availableCapital === 'number' ? Math.round(profile.availableCapital * 0.2) : 0,
      yearsInOperation: profile?.businessStatus === 'existing' ? 2 : 0,
      isRegistered: !!profile?.businessStatus && profile.businessStatus === 'existing',
      employeeCount: typeof profile?.employeeCount === 'number' ? profile.employeeCount : 0,
      existingLoans: profileLoans,
      keepsRecords: true,
      usesBankAccount: true,
      hasInsurance: false,
      isShgMember: false,
    };
  });

  const scoreResult = calculateGraminScore(inputs);

  const handleAddLoan = () => {
    setInputs((prev) => ({
      ...prev,
      existingLoans: [
        ...prev.existingLoans,
        {
          id: String(Date.now()),
          lenderType: 'bank',
          emiAmount: 2000,
          status: 'on_time',
        },
      ],
    }));
  };

  const handleRemoveLoan = (id: string) => {
    setInputs((prev) => ({
      ...prev,
      existingLoans: prev.existingLoans.filter((l) => l.id !== id),
    }));
  };

  const handleUpdateLoan = (id: string, updates: Partial<ExistingLoanInput>) => {
    setInputs((prev) => ({
      ...prev,
      existingLoans: prev.existingLoans.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }));
  };

  const scorePercentage = Math.round(((scoreResult.score - 300) / 600) * 100);

  return (
    <Card padding="lg" className="space-y-8 glass border-border/40 shadow-2xl rounded-3xl relative overflow-hidden">
      {/* Background flair */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border/40 pb-6 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <h3 className="text-2xl font-display font-bold text-foreground tracking-tight uppercase">
              {t.graminScore.title}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20 uppercase tracking-widest">
              {t.graminScore.selfReportedBadge}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2 font-serif">
            {t.graminScore.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <TextToSpeechButton
            text={`Your Gramin Credit Readiness Score is ${scoreResult.score} out of 900. Classification is ${scoreResult.band}. ${scoreResult.breakdown.cashFlowHealth.rationale}. ${scoreResult.breakdown.capitalAdequacy.rationale}.`}
            size="sm"
            label="Read Score"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="uppercase tracking-widest text-xs font-bold"
          >
            {isEditing ? t.graminScore.closeCalculator : t.graminScore.updateMetrics}
          </Button>
        </div>
      </div>

      {/* Main Score Visual Meter */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
        {/* Score Radial / Box (5 cols) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-8 rounded-3xl bg-surface/50 backdrop-blur-md border border-border/50 space-y-4 text-center shadow-inner">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {t.graminScore.currentScore}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl md:text-7xl font-display font-black text-foreground tracking-tighter">
              <CountUp start={300} end={scoreResult.score} duration={900} />
            </span>
            <span className="text-lg font-bold text-muted-foreground">/ 900</span>
          </div>

          <Badge variant={scoreResult.bandColor === 'success' ? 'success' : scoreResult.bandColor === 'info' ? 'info' : 'warning'} size="md" className="uppercase tracking-widest text-[10px]">
            {scoreResult.band}
          </Badge>

          {/* Progress Bar */}
          <div className="w-full space-y-1 pt-2">
            <div className="w-full h-3 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${scorePercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted font-mono font-medium">
              <span>{t.graminScore.scoreBase}</span>
              <span>{t.graminScore.scoreFair}</span>
              <span>{t.graminScore.scoreGood}</span>
              <span>{t.graminScore.scoreMax}</span>
            </div>
          </div>

          {scoreResult.isPartialData && (
            <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded-xl space-y-1">
              <p>ℹ️ {t.graminScore.partialDataNotice || 'Self-reported metrics estimate. Complete your financial profile for higher accuracy.'}</p>
              <Link href="/profile" className="inline-block text-primary hover:underline font-semibold">
                Complete Financial Profile →
              </Link>
            </div>
          )}
        </div>

        {/* 5 Component Breakdown Bars (7 cols) */}
        <div className="md:col-span-7 space-y-3.5 text-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
            {t.graminScore.breakdownTitle}
          </h4>

          {/* 1. Cash Flow */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-foreground">{t.graminScore.cashFlowHealth}:</span>
              <span className="text-foreground font-bold">{scoreResult.breakdown.cashFlowHealth.score} / 150 pts</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(scoreResult.breakdown.cashFlowHealth.score / 150) * 100}%` }} />
            </div>
            <p className="text-[11px] text-muted">{scoreResult.breakdown.cashFlowHealth.rationale}</p>
          </div>

          {/* 2. Capital Adequacy */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-foreground">{t.graminScore.capitalAdequacy}:</span>
              <span className="text-foreground font-bold">{scoreResult.breakdown.capitalAdequacy.score} / 100 pts</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(scoreResult.breakdown.capitalAdequacy.score / 100) * 100}%` }} />
            </div>
            <p className="text-[11px] text-muted">{scoreResult.breakdown.capitalAdequacy.rationale}</p>
          </div>

          {/* 3. Business Stability */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-foreground">{t.graminScore.businessStability}:</span>
              <span className="text-foreground font-bold">{scoreResult.breakdown.businessStability.score} / 100 pts</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(scoreResult.breakdown.businessStability.score / 100) * 100}%` }} />
            </div>
            <p className="text-[11px] text-muted">{scoreResult.breakdown.businessStability.rationale}</p>
          </div>

          {/* 4. Debt & Repayment */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-foreground">{t.graminScore.debtRepayment}:</span>
              <span className="text-foreground font-bold">{scoreResult.breakdown.debtRepayment.score} / 150 pts</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(scoreResult.breakdown.debtRepayment.score / 150) * 100}%` }} />
            </div>
            <p className="text-[11px] text-muted">{scoreResult.breakdown.debtRepayment.rationale}</p>
          </div>

          {/* 5. Financial Discipline */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold">
              <span className="text-foreground">{t.graminScore.financialDiscipline}:</span>
              <span className="text-foreground font-bold">{scoreResult.breakdown.financialDiscipline.score} / 100 pts</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(scoreResult.breakdown.financialDiscipline.score / 100) * 100}%` }} />
            </div>
            <p className="text-[11px] text-muted">{scoreResult.breakdown.financialDiscipline.rationale}</p>
          </div>
        </div>
      </div>

      {/* Interactive Editor Form Drawer */}
      {isEditing && (
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-5 animate-fade-in">
          <h4 className="text-sm font-bold text-foreground border-b border-border pb-2">
            ✏️ {t.graminScore.updateFactors}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-muted font-medium mb-1">{t.graminScore.revenueConsistency}</label>
              <select
                value={inputs.revenueConsistency}
                onChange={(e) => setInputs((p) => ({ ...p, revenueConsistency: e.target.value as any }))}
                className="w-full p-2.5 rounded-xl border border-border bg-surface-elevated text-foreground"
              >
                <option value="stable">{t.graminScore.stable}</option>
                <option value="growing">{t.graminScore.growing}</option>
                <option value="seasonal">{t.graminScore.seasonal}</option>
                <option value="declining">{t.graminScore.declining}</option>
              </select>
            </div>

            <div>
              <label className="block text-muted font-medium mb-1">{t.graminScore.emergencyReserve}</label>
              <input
                type="number"
                value={inputs.emergencyReserve || 0}
                onChange={(e) => setInputs((p) => ({ ...p, emergencyReserve: Number(e.target.value) || 0 }))}
                className="w-full p-2.5 rounded-xl border border-border bg-surface-elevated text-foreground"
              />
            </div>

            <div>
              <label className="block text-muted font-medium mb-1">{t.graminScore.yearsInOperation}</label>
              <input
                type="number"
                value={inputs.yearsInOperation || 0}
                onChange={(e) => setInputs((p) => ({ ...p, yearsInOperation: Number(e.target.value) || 0 }))}
                className="w-full p-2.5 rounded-xl border border-border bg-surface-elevated text-foreground"
              />
            </div>
          </div>

          {/* Discipline Checkboxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-foreground">
              <input
                type="checkbox"
                checked={inputs.keepsRecords}
                onChange={(e) => setInputs((p) => ({ ...p, keepsRecords: e.target.checked }))}
                className="rounded border-border text-primary"
              />
              <span>{t.graminScore.keepsBookkeeping}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-foreground">
              <input
                type="checkbox"
                checked={inputs.usesBankAccount}
                onChange={(e) => setInputs((p) => ({ ...p, usesBankAccount: e.target.checked }))}
                className="rounded border-border text-primary"
              />
              <span>{t.graminScore.activeBankAccount}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-foreground">
              <input
                type="checkbox"
                checked={inputs.hasInsurance}
                onChange={(e) => setInputs((p) => ({ ...p, hasInsurance: e.target.checked }))}
                className="rounded border-border text-primary"
              />
              <span>{t.graminScore.hasInsurance}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-foreground">
              <input
                type="checkbox"
                checked={inputs.isShgMember}
                onChange={(e) => setInputs((p) => ({ ...p, isShgMember: e.target.checked }))}
                className="rounded border-border text-primary"
              />
              <span>{t.graminScore.shgCoopMember}</span>
            </label>
          </div>

          {/* Existing Loans Manager */}
          <div className="space-y-3 pt-3 border-t border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">{t.graminScore.activeLoans} ({inputs.existingLoans.length})</span>
              <button
                type="button"
                onClick={handleAddLoan}
                className="text-xs text-primary font-bold hover:underline"
              >
                {t.graminScore.addLoan}
              </button>
            </div>

            {inputs.existingLoans.map((loan) => (
              <div key={loan.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center p-3 rounded-xl bg-surface-elevated border border-border text-xs">
                <div>
                  <span className="text-muted block text-[10px]">{t.graminScore.lenderType}</span>
                  <select
                    value={loan.lenderType}
                    onChange={(e) => handleUpdateLoan(loan.id, { lenderType: e.target.value as any })}
                    className="w-full p-1.5 rounded-lg border border-border bg-surface text-foreground"
                  >
                    <option value="bank">{t.graminScore.bank}</option>
                    <option value="nbfc">{t.graminScore.nbfc}</option>
                    <option value="shg_cooperative">{t.graminScore.shg}</option>
                    <option value="informal_moneylender">{t.graminScore.moneylender}</option>
                  </select>
                </div>

                <div>
                  <span className="text-muted block text-[10px]">{t.graminScore.monthlyEmi}</span>
                  <input
                    type="number"
                    value={loan.emiAmount}
                    onChange={(e) => handleUpdateLoan(loan.id, { emiAmount: Number(e.target.value) || 0 })}
                    className="w-full p-1.5 rounded-lg border border-border bg-surface text-foreground"
                  />
                </div>

                <div>
                  <span className="text-muted block text-[10px]">{t.graminScore.repaymentStatus}</span>
                  <select
                    value={loan.status}
                    onChange={(e) => handleUpdateLoan(loan.id, { status: e.target.value as any })}
                    className="w-full p-1.5 rounded-lg border border-border bg-surface text-foreground"
                  >
                    <option value="on_time">{t.graminScore.onTime}</option>
                    <option value="occasionally_missed">{t.graminScore.occasionallyMissed}</option>
                    <option value="defaulted">{t.graminScore.defaulted}</option>
                  </select>
                </div>

                <div className="flex justify-end pt-3 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveLoan(loan.id)}
                    className="text-danger hover:underline text-xs"
                  >
                    {t.graminScore.remove}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MANDATORY PROMINENT DISCLAIMER */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-3">
        <span className="text-base shrink-0">⚠️</span>
        <p className="font-medium">
          {t.graminScore.disclaimer || GRAMIN_DISCLAIMER}
        </p>
      </div>
    </Card>
  );
}
