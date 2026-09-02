'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdminGuard from '@/components/admin/AdminGuard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DiffViewer from '@/components/admin/DiffViewer';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAllUpdateHistory } from '@/lib/firestore/admin';
import type { SchemeUpdateRecord } from '@/types';

const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

export default function AdminHistoryClient() {
  const { t } = useLanguage();
  const [history, setHistory] = useState<SchemeUpdateRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected' | 'pending'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const list = await getAllUpdateHistory();
        setHistory(list);
      } catch (err) {
        console.error('Error loading scheme update history:', err);
      }
    }
    load();
  }, []);

  const filteredHistory = history.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  return (
    <AdminGuard>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href={`/${ADMIN_ROUTE_KEY}/admin`} className="text-xs text-muted hover:text-foreground">
                {t.admin.backHome}
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              {t.admin.auditLogTitle}
            </h1>
            <p className="text-xs text-muted mt-1">
              {t.admin.auditLogSubtitle}
            </p>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-surface p-1.5 rounded-xl border border-border">
            {(['all', 'approved', 'rejected', 'pending'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filter === status
                    ? 'bg-surface-elevated text-primary shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* List of Audit Entries */}
        {filteredHistory.length > 0 ? (
          <div className="space-y-4">
            {filteredHistory.map((item) => {
              const isExpanded = expandedId === item.id;
              const ts = item.timestamp as unknown;
              const dateStr = ts
                ? (typeof (ts as { toDate?: () => Date }).toDate === 'function'
                    ? (ts as { toDate: () => Date }).toDate().toLocaleString()
                    : new Date(ts as string | number | Date).toLocaleString())
                : 'N/A';

              return (
                <Card key={item.id} padding="lg" className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                              : item.status === 'rejected'
                              ? 'bg-danger-light text-danger border border-danger/20'
                              : 'bg-saffron-100 dark:bg-saffron-900/50 text-saffron-800 dark:text-saffron-300'
                          }`}
                        >
                          {item.status}
                        </span>
                        <h2 className="font-bold text-sm text-foreground">
                          {item.schemeName || item.schemeId}
                        </h2>
                      </div>
                      <p className="text-xs text-muted">
                        Review Date: <span className="font-mono">{dateStr}</span>
                        {item.adminEmail && ` • Reviewer: ${item.adminEmail}`}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      {isExpanded ? 'Hide Changes' : 'View Changes'}
                    </Button>
                  </div>

                  {item.notes && (
                    <div className="p-3 bg-surface rounded-xl text-xs text-muted border border-border">
                      <span className="font-semibold text-foreground">Notes: </span>
                      {item.notes}
                    </div>
                  )}

                  {isExpanded && item.proposedChanges && (
                    <div className="pt-3 border-t border-border">
                      <DiffViewer proposedChanges={item.proposedChanges} schemeName={item.schemeName} />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-surface rounded-2xl border border-dashed border-border text-muted text-sm">
            No audit records found matching &ldquo;{filter}&rdquo;.
          </div>
        )}
      </main>
      <Footer />
    </AdminGuard>
  );
}
