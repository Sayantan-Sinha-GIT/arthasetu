import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Government Schemes Directory',
  description: 'Explore Central and State Government loan subsidies, capital grants, and support schemes tailored for Indian rural and micro-enterprises.',
};

export default function SchemesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
