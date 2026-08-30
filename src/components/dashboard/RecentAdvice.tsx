'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { Advice } from '@/types';

interface RecentAdviceProps {
  userId: string;
}

export default function RecentAdvice({ userId }: RecentAdviceProps) {
  const { t } = useLanguage();
  const [adviceList, setAdviceList] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentAdvice() {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'advice'),
          where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        const fetched: Advice[] = [];
        snapshot.forEach((d) => {
          fetched.push({ id: d.id, ...d.data() } as Advice);
        });
        fetched.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setAdviceList(fetched.slice(0, 3));
      } catch (err) {
        console.warn('Recent advice query:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentAdvice();
  }, [userId]);

  return (
    <Card padding="md" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">💡</span>
          <h3 className="text-base font-bold text-foreground">
            {t.dashboard.recentAdvice}
          </h3>
        </div>
        {adviceList.length > 0 && (
          <Link
            href="/saved-advice"
            className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            {t.dashboard.viewAllAdvice} →
          </Link>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-12 rounded-xl" />
        </div>
      ) : adviceList.length > 0 ? (
        <div className="space-y-3">
          {adviceList.map((a) => (
            <Link
              key={a.id}
              href="/saved-advice"
              className="block p-3.5 rounded-2xl bg-surface border border-border hover:border-primary/40 hover:bg-surface-elevated transition-all group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {a.title || 'Advisor Guidance'}
                  </h4>
                  <p className="text-xs text-muted mt-0.5 truncate">
                    {a.content}
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
            {t.dashboard.noAdvice}
          </p>
          <Link href="/advisor">
            <Button size="sm" variant="outline" className="text-xs">
              + {t.dashboard.askAI}
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
