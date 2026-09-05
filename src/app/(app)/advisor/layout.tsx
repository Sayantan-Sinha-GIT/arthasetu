import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Ask ArthaSetu — Multilingual AI Advisor',
  description: 'Instant, personalized financial and business guidance for Indian micro-entrepreneurs in 23 languages through voice and text.',
};

export default function AdvisorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
