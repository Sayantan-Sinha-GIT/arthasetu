import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Saved Financial Plans',
  description: 'Review, update, and download your saved bank-ready micro-enterprise project proposals and financial feasibility models.',
};

export default function SavedPlansLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
