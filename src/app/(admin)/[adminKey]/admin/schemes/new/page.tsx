import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdminGuard from '@/components/admin/AdminGuard';
import SchemeEditorForm from '@/components/admin/SchemeEditorForm';

const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

export default async function AdminNewSchemePage({
  params,
}: {
  params: Promise<{ adminKey: string }>;
}) {
  const { adminKey } = await params;
  const validKey = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

  if (adminKey !== validKey) {
    notFound();
  }

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

        <SchemeEditorForm isNew />
      </main>
      <Footer />
    </AdminGuard>
  );
}
