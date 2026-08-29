'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase().trim();
const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * Protects all /admin/* routes by checking that the logged-in Firebase user's
 * email exactly matches NEXT_PUBLIC_ADMIN_EMAIL.
 * Non-matching users are kicked to the secured admin login route.
 */
export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isAuthorizedAdmin =
    !!user &&
    !!ADMIN_EMAIL &&
    user.email?.toLowerCase().trim() === ADMIN_EMAIL;

  useEffect(() => {
    if (!loading && !isAuthorizedAdmin) {
      router.replace(`/${ADMIN_ROUTE_KEY}/admin/login`);
    }
  }, [loading, isAuthorizedAdmin, router]);

  if (loading) {
    return (
      <main className="min-h-[80vh] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted mt-3 animate-pulse">
          Verifying administrative credentials...
        </p>
      </main>
    );
  }

  if (!isAuthorizedAdmin) {
    // While the redirect fires, show nothing
    return null;
  }

  return <>{children}</>;
}

/**
 * Helper to check admin email from any component or utility.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email || !ADMIN_EMAIL) return false;
  return email.toLowerCase().trim() === ADMIN_EMAIL;
}
