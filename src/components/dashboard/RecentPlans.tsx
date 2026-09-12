'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { Plan } from '@/types';

interface RecentPlansProps {
  userId: string;
}

export default function RecentPlans({ userId }: RecentPlansProps) {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentPlans() {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'plans'),
          where('userId', '==', userId),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const fetched: Plan[] = [];
        snapshot.forEach((d) => {
          fetched.push({ id: d.id, ...d.data() } as Plan);
        });
        fetched.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setPlans(fetched.slice(0, 3));
      } catch (err) {
        // Index might not exist yet or collection empty, fallback gracefully
        console.warn('Recent plans query:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentPlans();
  }, [userId]);

  return (
    <Card padding="md" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📑</span>
          <h3 className="text-base font-bold text-foreground">
            {t.dashboard.recentPlans}
          </h3>
        </div>
        {plans.length > 0 && (
          <Link
            href="/saved-plans"
            className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            {t.dashboard.viewAllPlans} →
          </Link>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-12 rounded-xl" />
        </div>
      ) : plans.length > 0 ? (
        <div className="space-y-3">
          {plans.map((p) => (
            <Link
              key={p.id}
              href={`/saved-plans/${p.id}`}
              className="block p-3.5 rounded-2xl bg-surface border border-border hover:border-primary/40 hover:bg-surface-elevated transition-all group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {p.title || p.businessType || 'Financial Plan'}
                  </h4>
                  <p className="text-xs text-muted mt-0.5">
                    Funding Gap: {typeof p.calculatedValues?.fundingGap === 'number' ? `₹${p.calculatedValues.fundingGap.toLocaleString('en-IN')}` : 'N/A'} • Profit: {typeof p.calculatedValues?.monthlyNetProfit === 'number' ? `₹${p.calculatedValues.monthlyNetProfit.toLocaleString('en-IN')}/mo` : 'N/A'}
                  </p>
                </div>
                <span className="text-xs text-muted group-hover:text-primary transition-colors shrink-0">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 px-4 bg-surface rounded-2xl border border-dashed border-border space-y-3">
          <p className="text-xs text-muted leading-relaxed max-w-xs mx-auto">
            {t.dashboard.noPlans}
          </p>
          <Link href="/planner">
            <Button size="sm" variant="outline" className="text-xs">
              + {t.dashboard.createPlan}
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
