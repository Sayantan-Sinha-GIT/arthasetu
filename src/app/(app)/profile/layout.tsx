import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Entrepreneur Profile',
  description: 'Manage your business address, PIN code, language settings, and active loan details for tailored government scheme matching.',
};

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
