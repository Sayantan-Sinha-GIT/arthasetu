'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdminGuard from '@/components/admin/AdminGuard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Input from '@/components/ui/Input';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAllSchemes } from '@/lib/firestore/schemes';
import type { Scheme } from '@/types';

const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

export default function AdminSchemesDirectoryClient() {
  const { t } = useLanguage();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const list = await getAllSchemes();
        setSchemes(list);
      } catch (err) {
        console.error('Error loading schemes for admin:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = schemes.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.shortName.toLowerCase().includes(q) ||
      (s.state && s.state.toLowerCase().includes(q)) ||
      s.category?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminGuard>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href={`/${ADMIN_ROUTE_KEY}/admin`} className="text-xs text-muted hover:text-foreground">
                {t.admin.backHome}
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              {t.admin.schemesDirectoryTitle}
            </h1>
            <p className="text-xs text-muted mt-1">
              {t.admin.schemesDirectorySubtitle}
            </p>
          </div>

          <Link href={`/${ADMIN_ROUTE_KEY}/admin/schemes/new`}>
            <Button size="sm" className="font-bold">
              ➕ {t.admin.addNewScheme}
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <Input
            placeholder={t.admin.searchPlaceholder || 'Search by name, state, or category...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        {/* Schemes Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((scheme) => (
              <Card key={scheme.id} padding="md" className="space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-navy-100 dark:bg-navy-900 text-navy-800 dark:text-navy-200 border border-navy-200 dark:border-navy-700">
                      {scheme.governmentLevel === 'central' ? '🇮🇳 Central' : `🏛️ ${scheme.state}`}
                    </span>
                    <span className="text-[10px] text-muted">{scheme.category}</span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground mt-2 line-clamp-1">
                    {scheme.name}
                  </h3>
                  <p className="text-xs text-muted line-clamp-2 mt-1">
                    {scheme.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted">ID: {scheme.id}</span>
                  <Link
                    href={`/${ADMIN_ROUTE_KEY}/admin/schemes/${scheme.id}/edit`}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Edit / AI Update →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-surface rounded-2xl border border-dashed border-border text-muted text-sm">
            No schemes found matching your search.
          </div>
        )}
      </main>
      <Footer />
    </AdminGuard>
  );
}
