'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AmbientBackground from '@/components/ui/AmbientBackground';
import PlannerWizard from '@/components/planner/PlannerWizard';
import PlanResultView from '@/components/planner/PlanResultView';
import { getUserProfile } from '@/lib/firestore/users';
import { calculateFinancialPlan } from '@/lib/calculator';
import type { PlanInputs, CalculatedValues, UserProfile } from '@/types';

export default function PlannerPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Active Generated Plan State
  const [activePlan, setActivePlan] = useState<{
    inputs: PlanInputs;
    calculated: CalculatedValues;
    narrative: {
      executiveSummary: string;
      keyAssumptions: string[];
      riskAnalysis: string[];
      actionableNextSteps: string[];
    };
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadPlanner() {
      if (!user) return;
      try {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          setProfile(userProfile);
        }
      } catch (err) {
        console.error('Error loading profile for planner:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadPlanner();
    }
  }, [user, authLoading, router]);

  const handleGeneratePlan = async (inputs: PlanInputs) => {
    setGenerating(true);
    try {
      // 1. DETERMINISTIC MATH CALCULATION (Client-Side, zero AI arithmetic)
      const calculated = calculateFinancialPlan(inputs);

      // 2. QUALITATIVE AI NARRATIVE GENERATION (Server-Side Gemini Flash)
      const response = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs,
          calculatedValues: calculated,
          userProfile: profile,
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate plan narrative');
      }

      setActivePlan({
        inputs,
        calculated,
        narrative: data.narrative,
      });
    } catch (err) {
      console.error('Plan generation failed:', err);
      // Fallback narrative so user is never blocked
      const fallbackCalculated = calculateFinancialPlan(inputs);
      setActivePlan({
        inputs,
        calculated: fallbackCalculated,
        narrative: {
          executiveSummary: `This financial model projects a monthly net profit of ₹${fallbackCalculated.monthlyNetProfit.toLocaleString('en-IN')} with a break-even payback period of approximately ${fallbackCalculated.breakEvenMonths || 'N/A'} months in ${inputs.location}.`,
          keyAssumptions: [
            `Assumes stable monthly production scale of ${inputs.businessScale}.`,
            `Assumes prompt realization of sales at ₹${inputs.unitPrice} per unit.`,
            `Assumes working capital reserve covers initial operating lags.`,
          ],
          riskAnalysis: [
            `Raw material price surge — establish fixed-rate supplier agreements.`,
            `Cash flow cycles — maintain ₹${inputs.workingCapitalReserve.toLocaleString('en-IN')} reserve buffer.`,
          ],
          actionableNextSteps: [
            `Prepare bank loan / PMEGP application for the ₹${fallbackCalculated.fundingGap.toLocaleString('en-IN')} funding requirement.`,
            `Obtain formal vendor quotations for ₹${inputs.equipmentCost.toLocaleString('en-IN')} in equipment.`,
            `Secure advance orders from local market buyers in ${inputs.location}.`,
          ],
        },
      });
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-[80vh] flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted mt-3 animate-pulse">Loading Financial Planner...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        {/* Top Page Header */}
        {!activePlan && (
          <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 bg-[#0B0806] border border-[#3A291D] shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent mix-blend-screen pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-white flex items-center gap-4 tracking-tighter uppercase leading-[0.9]">
                <span className="text-5xl sm:text-6xl text-primary drop-shadow-[0_0_15px_rgba(255,119,0,0.4)]">📊</span>
                <span>Financial Structuring<br/>& Planning Engine</span>
              </h1>
              <p className="text-sm sm:text-base text-white/70 font-serif max-w-2xl">
                Deterministic financial arithmetic combined with AI-powered market assumptions and bankability analysis.
              </p>
            </div>
          </div>
        )}

        {/* Wizard View or Generated Plan Result View */}
        {activePlan ? (
          <PlanResultView
            inputs={activePlan.inputs}
            calculated={activePlan.calculated}
            narrative={activePlan.narrative}
            userId={user?.uid || ''}
            onEdit={() => setActivePlan(null)}
          />
        ) : (
          <PlannerWizard
            initialProfile={profile}
            onGeneratePlan={handleGeneratePlan}
            isLoading={generating}
          />
        )}
      </main>
    </>
  );
}
