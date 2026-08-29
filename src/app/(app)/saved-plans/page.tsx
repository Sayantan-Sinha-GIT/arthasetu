'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { getSavedPlans, deletePlan } from '@/lib/firestore/plans';
import { downloadPlanPdf } from '@/lib/pdf/export-plan-pdf';
import type { Plan } from '@/types';

export default function SavedPlansPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadPlans() {
      if (!user) return;
      try {
        const list = await getSavedPlans(user.uid);
        setPlans(list);
      } catch (err) {
        console.error('Error loading saved plans:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadPlans();
    }
  }, [user, authLoading, router]);

  const handleDelete = async (planId: string) => {
    setDeletingId(planId);
    try {
      await deletePlan(planId);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (err) {
      console.error('Failed to delete plan:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadPlan = (plan: Plan) => {
    try {
      downloadPlanPdf({
        inputs: plan.inputs,
        calculated: plan.calculatedValues,
        narrative: plan.aiNarrative || {
          executiveSummary: 'Feasibility analysis for ' + plan.businessType,
          keyAssumptions: [],
          riskAnalysis: [],
          actionableNextSteps: [],
        },
      }, `ArthaSetu_${plan.businessType.replace(/\s+/g, '_')}_Plan.pdf`);
    } catch (err) {
      console.error('Error downloading saved plan PDF:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-[80vh] flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted mt-3 animate-pulse">{t.common.loading}</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2">
              <span>📋</span>
              <span>{t.nav.savedPlans}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Your saved financial feasibility models, funding gap calculations, and bank-ready proposals
            </p>
          </div>

          <Link href="/planner">
            <Button size="md">
              + Create New Financial Plan
            </Button>
          </Link>
        </div>

        {/* Plans Grid */}
        {plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} padding="lg" className="flex flex-col justify-between space-y-5 hover:border-primary/40 transition-all">
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                      {plan.businessType}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(plan.id)}
                      disabled={deletingId === plan.id}
                      className="p-1 rounded-lg text-muted hover:text-danger hover:bg-danger-light transition-colors"
                      title="Delete this plan"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Title & Location */}
                  <div>
                    <h2 className="text-base font-bold text-foreground line-clamp-1">
                      {plan.title}
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      📍 {plan.inputs?.location || 'India'} • Scale: {plan.inputs?.businessScale || 'Standard'}
                    </p>
                  </div>

                  {/* Key Metrics Badges */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="p-2.5 rounded-2xl bg-surface border border-border text-center">
                      <span className="text-[9px] font-bold uppercase text-muted block">{t.planner.loanGap}</span>
                      <span className="text-xs sm:text-sm font-bold text-foreground mt-0.5 block">
                        ₹{plan.calculatedValues?.fundingGap?.toLocaleString('en-IN') || 0}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-surface border border-border text-center">
                      <span className="text-[9px] font-bold uppercase text-muted block">{t.planner.netProfit}</span>
                      <span className="text-xs sm:text-sm font-bold text-success mt-0.5 block">
                        ₹{plan.calculatedValues?.monthlyNetProfit?.toLocaleString('en-IN') || 0}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-surface border border-border text-center">
                      <span className="text-[9px] font-bold uppercase text-muted block">{t.planner.breakEven}</span>
                      <span className="text-xs sm:text-sm font-bold text-foreground mt-0.5 block">
                        {plan.calculatedValues?.breakEvenMonths ? `${plan.calculatedValues.breakEvenMonths} Mo` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Executive Summary Preview */}
                  {plan.aiNarrative?.executiveSummary && (
                    <p className="text-xs text-muted leading-relaxed line-clamp-2 italic">
                      &ldquo;{plan.aiNarrative.executiveSummary}&rdquo;
                    </p>
                  )}
                </div>

                {/* Footer Action Links */}
                <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted">
                    {plan.createdAt?.toDate ? plan.createdAt.toDate().toLocaleDateString() : 'Recently'}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPlan(plan)}
                      className="text-xs font-bold text-primary border-primary/30 hover:bg-primary/10"
                    >
                      📄 Export PDF
                    </Button>

                    <Link href={`/saved-plans/${plan.id}`}>
                      <Button size="sm">
                        View Details →
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 px-6 bg-surface-elevated rounded-3xl border border-dashed border-border space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl mx-auto shadow-sm">
              📊
            </div>
            <h3 className="text-lg font-bold text-foreground">
              No Financial Plans Saved Yet
            </h3>
            <p className="text-xs sm:text-sm text-muted max-w-sm mx-auto leading-relaxed">
              Use our guided financial planner to compute your startup costs, monthly profit, and loan EMI in 5 simple steps.
            </p>
            <Link href="/planner" className="inline-block pt-2">
              <Button size="md">
                Create Your First Financial Plan →
              </Button>
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
