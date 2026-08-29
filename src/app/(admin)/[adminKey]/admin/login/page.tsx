import { notFound } from 'next/navigation';
import AdminLoginForm from '@/components/admin/AdminLoginForm';

export default async function AdminKeyLoginPage({
  params,
}: {
  params: Promise<{ adminKey: string }>;
}) {
  const { adminKey } = await params;
  const validKey = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

  if (adminKey !== validKey) {
    notFound();
  }

  return <AdminLoginForm />;
}
