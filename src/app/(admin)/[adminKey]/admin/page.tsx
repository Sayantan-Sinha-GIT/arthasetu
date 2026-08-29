import { notFound } from 'next/navigation';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';

export default async function AdminDashboardRoute({
  params,
}: {
  params: Promise<{ adminKey: string }>;
}) {
  const { adminKey } = await params;
  const validKey = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

  if (adminKey !== validKey) {
    notFound();
  }

  return <AdminDashboardClient />;
}
