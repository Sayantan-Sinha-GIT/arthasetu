import { notFound } from 'next/navigation';
import AdminSchemesDirectoryClient from '@/components/admin/AdminSchemesDirectoryClient';

export default async function AdminSchemesRoute({
  params,
}: {
  params: Promise<{ adminKey: string }>;
}) {
  const { adminKey } = await params;
  const validKey = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

  if (adminKey !== validKey) {
    notFound();
  }

  return <AdminSchemesDirectoryClient />;
}
