import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Sign In / Register',
  description: 'Log in or sign up for ArthaSetu to access multilingual business advisory, financial planning, and government scheme matching.',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
