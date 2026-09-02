'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

/**
 * App Layout guarding all user-facing routes under (app).
 * 1. If user is an administrator, redirect them to the admin dashboard.
 * 2. If user is a regular user whose email is not verified, redirect to /verify-email.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user && isAdmin) {
      router.replace(`/${ADMIN_ROUTE_KEY}/admin`);
    } else if (user && !user.emailVerified) {
      router.replace('/verify-email');
    }
  }, [user, loading, isAdmin, router]);

  if (!loading && user && !user.emailVerified && !isAdmin) {
    return null;
  }

  return (
    <div className="page-shell min-h-screen flex flex-col text-foreground transition-colors duration-300 pt-20">
      {children}
    </div>
  );
}
