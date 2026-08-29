import { notFound } from 'next/navigation';
import AdminHistoryClient from '@/components/admin/AdminHistoryClient';

export default async function AdminHistoryRoute({
  params,
}: {
  params: Promise<{ adminKey: string }>;
}) {
  const { adminKey } = await params;
  const validKey = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

  if (adminKey !== validKey) {
    notFound();
  }

  return <AdminHistoryClient />;
}
