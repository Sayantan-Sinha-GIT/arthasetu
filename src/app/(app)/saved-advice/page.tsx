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
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { getSavedAdvice, deleteSavedAdvice } from '@/lib/firestore/advice';
import type { Advice } from '@/types';

export default function SavedAdvicePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [adviceList, setAdviceList] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadAdvice() {
      if (!user) return;
      try {
        const list = await getSavedAdvice(user.uid);
        setAdviceList(list);
      } catch (err) {
        console.error('Error loading saved advice:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadAdvice();
    }
  }, [user, authLoading, router]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSavedAdvice(id);
      setAdviceList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete advice:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = adviceList.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.content?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      item.businessContext?.toLowerCase().includes(q)
    );
  });

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
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <span>💡</span>
              <span>{t.nav.savedAdvice}</span>
            </h1>
            <p className="text-muted text-sm sm:text-base mt-1">
              Your saved recommendations, financial tips, and business strategies
            </p>
          </div>

          <Link href="/advisor">
            <Button size="md">
              + {t.dashboard.askAI}
            </Button>
          </Link>
        </div>

        {/* Search Bar */}
        {adviceList.length > 0 && (
          <div className="max-w-md">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved advice by keyword..."
              icon={
                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
        )}

        {/* Advice List Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((item) => (
              <Card key={item.id} padding="lg" className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Top Bar: Category & Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      {item.category || 'General'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1 rounded-lg text-muted hover:text-danger hover:bg-danger-light transition-colors"
                      title="Delete this advice"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-foreground">
                    {item.title}
                  </h3>

                  {/* Content */}
                  <div className="text-xs sm:text-sm text-muted leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto pr-1">
                    {item.content}
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-muted">
                  {item.businessContext && (
                    <span className="truncate max-w-[200px]">📌 {item.businessContext}</span>
                  )}
                  <span>
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Recently'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : adviceList.length > 0 ? (
          <div className="text-center py-12 bg-surface rounded-3xl border border-border">
            <p className="text-sm text-muted">{t.common.noResults}</p>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 px-6 bg-surface-elevated rounded-3xl border border-dashed border-border space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl mx-auto shadow-sm">
              💡
            </div>
            <h3 className="text-lg font-bold text-foreground">
              No Saved Advice Yet
            </h3>
            <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
              When chatting with ArthaSetu, click the <strong>&ldquo;Save as Advice&rdquo;</strong> button on any response to bookmark it here.
            </p>
            <Link href="/advisor" className="inline-block pt-2">
              <Button size="md">
                Ask ArthaSetu Now →
              </Button>
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
