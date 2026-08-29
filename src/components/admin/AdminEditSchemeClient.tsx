'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdminGuard from '@/components/admin/AdminGuard';
import SchemeEditorForm from '@/components/admin/SchemeEditorForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { getSchemeById } from '@/lib/firestore/schemes';
import type { Scheme } from '@/types';

const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

export default function AdminEditSchemeClient({ id }: { id: string }) {
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const doc = await getSchemeById(id);
        setScheme(doc);
      } catch (err) {
        console.error('Error loading scheme for editing:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  return (
    <AdminGuard>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        <div>
          <Link
            href={`/${ADMIN_ROUTE_KEY}/admin/schemes`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground transition-colors"
          >
            <span>←</span>
            <span>Back to Schemes Directory</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : scheme ? (
          <SchemeEditorForm initialData={scheme} isNew={false} />
        ) : (
          <div className="py-16 text-center space-y-4">
            <p className="text-sm text-danger font-bold">Scheme record not found.</p>
            <Link href={`/${ADMIN_ROUTE_KEY}/admin/schemes`}>
              <Button size="sm">Return to Schemes</Button>
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </AdminGuard>
  );
}
