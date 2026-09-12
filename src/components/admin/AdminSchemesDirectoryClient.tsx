'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdminGuard from '@/components/admin/AdminGuard';
import SchemeAiUpdateModal from '@/components/admin/SchemeAiUpdateModal';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Input from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAllSchemes } from '@/lib/firestore/schemes';
import { getErrorMessage } from '@/lib/utils/errors';
import type { Scheme } from '@/types';

const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

export default function AdminSchemesDirectoryClient() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Scheme deletion states
  const [targetSchemeToDelete, setTargetSchemeToDelete] = useState<Scheme | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  // Scheme being updated with AI
  const [targetSchemeForUpdate, setTargetSchemeForUpdate] = useState<Scheme | null>(null);

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

  const handleAdminDeleteScheme = async () => {
    if (!targetSchemeToDelete) return;
    setDeleteLoading(true);
    setDeleteSuccessMsg('');
    setDeleteErrorMsg('');

    try {
      if (!user) {
        throw new Error('Admin user session expired. Please re-login.');
      }
      const token = await user.getIdToken(true);

      const res = await fetch('/api/admin/schemes/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schemeId: targetSchemeToDelete.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete government scheme');
      }

      setSchemes((prev) => prev.filter((s) => s.id !== targetSchemeToDelete.id));
      setDeleteSuccessMsg(
        data.message || `Scheme "${targetSchemeToDelete.name}" was permanently deleted.`
      );
      setTargetSchemeToDelete(null);
    } catch (err) {
      console.error('Scheme deletion failed:', err);
      setDeleteErrorMsg(getErrorMessage(err, 'Failed to delete scheme. Please try again.'));
    } finally {
      setDeleteLoading(false);
    }
  };

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
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-28 pb-8 space-y-6 animate-fade-in">
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

        {/* Global Feedback Banners */}
        {deleteSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-base">✅</span>
              <span className="font-bold">{deleteSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeleteSuccessMsg('')}
              className="text-xs text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        )}

        {deleteErrorMsg && (
          <div className="p-4 rounded-2xl bg-danger-light border border-danger/30 text-danger text-xs flex items-center justify-between gap-2 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span className="font-bold">{deleteErrorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeleteErrorMsg('')}
              className="text-xs text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        )}

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

                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted truncate max-w-[120px]">ID: {scheme.id}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTargetSchemeForUpdate(scheme)}
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      ✨ Update with AI
                    </button>
                    <Link
                      href={`/${ADMIN_ROUTE_KEY}/admin/schemes/${scheme.id}/edit`}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      {t.common.edit || 'Edit'} →
                    </Link>
                    <button
                      type="button"
                      onClick={() => setTargetSchemeToDelete(scheme)}
                      className="px-2 py-0.5 rounded bg-danger/10 text-danger hover:bg-danger hover:text-white text-[11px] font-bold transition-all cursor-pointer"
                    >
                      🗑️ {t.common.delete || 'Delete'}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-surface rounded-2xl border border-dashed border-border text-muted text-sm">
            No schemes found matching your search.
          </div>
        )}

        {/* Scheme Deletion Confirmation Dialog Modal */}
        {targetSchemeToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-surface-elevated border border-danger/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-danger/10 text-danger flex items-center justify-center text-xl shrink-0">
                  🏛️
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {t.admin.deleteSchemeTitle || 'Permanent Scheme Deletion'}
                  </h3>
                  <p className="text-xs text-muted">
                    {t.admin.deleteSchemeSubtitle || 'Destructive action logged to admin audit trail'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-danger-light/30 border border-danger/20 text-xs text-danger-dark dark:text-danger space-y-1.5">
                <p className="font-bold">Target Scheme:</p>
                <p className="font-semibold text-foreground">{targetSchemeToDelete.name}</p>
                <p className="font-mono text-[11px] opacity-80">ID: {targetSchemeToDelete.id}</p>
                <p className="pt-1 leading-relaxed opacity-95">
                  <strong>Warning:</strong> This cannot be undone. It will permanently remove this scheme from Firestore and invalidate all references in saved user plans.
                </p>
              </div>

              {deleteErrorMsg && (
                <div className="p-3 rounded-xl bg-danger-light border border-danger/30 text-danger text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span className="font-bold">{deleteErrorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={deleteLoading}
                  onClick={() => setTargetSchemeToDelete(null)}
                >
                  {t.common.cancel || 'Cancel'}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  isLoading={deleteLoading}
                  onClick={handleAdminDeleteScheme}
                  className="shadow-md font-bold"
                >
                  {t.admin.confirmDeleteScheme || 'Confirm & Delete Scheme'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {targetSchemeForUpdate && (
          <SchemeAiUpdateModal
            scheme={targetSchemeForUpdate}
            onClose={() => setTargetSchemeForUpdate(null)}
            onPublished={(message) => {
              setTargetSchemeForUpdate(null);
              setDeleteSuccessMsg(message);
              getAllSchemes().then(setSchemes).catch(() => {});
            }}
          />
        )}
      </main>
      <Footer />
    </AdminGuard>
  );
}
