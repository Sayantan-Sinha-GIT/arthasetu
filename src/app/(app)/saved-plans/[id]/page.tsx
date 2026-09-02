'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import PlanResultView from '@/components/planner/PlanResultView';
import { getPlanById } from '@/lib/firestore/plans';
import type { Plan } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlanDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadPlan() {
      if (!id) return;
      try {
        const doc = await getPlanById(id);
        if (doc) {
          setPlan(doc);
        } else {
          setError('Financial plan not found.');
        }
      } catch (err) {
        console.error('Error loading plan:', err);
        setError('Failed to load plan details.');
      } finally {
        setLoading(false);
      }
    }

    if (user && id) {
      loadPlan();
    }
  }, [user, id, authLoading, router]);

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-[80vh] flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted mt-3 animate-pulse">Loading Financial Plan...</p>
        </main>
      </>
    );
  }

  if (error || !plan) {
    return (
      <>
        <Navbar />
        <main className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-danger-light text-danger flex items-center justify-center text-2xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {error || t.savedPlansPage.notFoundTitle}
          </h2>
          <p className="text-sm text-muted">
            {t.savedPlansPage.notFoundDesc}
          </p>
          <Link href="/saved-plans">
            <Button size="md">{t.savedPlansPage.backToSavedPlans}</Button>
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        {/* Back Link */}
        <div>
          <Link
            href="/saved-plans"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground transition-colors"
          >
            <span>←</span>
            <span>Back to All Saved Plans</span>
          </Link>
        </div>

        {/* Full Plan Presentation */}
        <PlanResultView
          inputs={plan.inputs}
          calculated={plan.calculatedValues}
          narrative={plan.aiNarrative}
          userId={user?.uid || ''}
          onEdit={() => router.push('/planner')}
        />
      </main>
    </>
  );
}
