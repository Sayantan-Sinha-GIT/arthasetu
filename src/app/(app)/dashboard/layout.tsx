import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your micro-enterprise profile, track Gramin credit readiness, review saved plans, and access personalized advisory.',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
