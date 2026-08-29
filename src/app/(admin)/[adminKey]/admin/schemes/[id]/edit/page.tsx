import { notFound } from 'next/navigation';
import AdminEditSchemeClient from '@/components/admin/AdminEditSchemeClient';

export default async function AdminEditSchemeRoute({
  params,
}: {
  params: Promise<{ adminKey: string; id: string }>;
}) {
  const { adminKey, id } = await params;
  const validKey = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

  if (adminKey !== validKey) {
    notFound();
  }

  return <AdminEditSchemeClient id={id} />;
}
