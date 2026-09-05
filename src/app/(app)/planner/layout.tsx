import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Financial Planner & Bank-Ready Proposals',
  description: 'Compute startup expenditure, monthly cash flow, break-even timelines, and generate bank-ready loan proposals in 5 simple steps.',
};

export default function PlannerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
