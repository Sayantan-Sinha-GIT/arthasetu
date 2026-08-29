'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

/**
 * App Layout guarding all user-facing routes under (app).
 * If the current authenticated user is an administrator, redirect them to
 * the admin dashboard since they do not have a business profile.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && isAdmin) {
      router.replace(`/${ADMIN_ROUTE_KEY}/admin`);
    }
  }, [user, loading, isAdmin, router]);

  return <>{children}</>;
}
