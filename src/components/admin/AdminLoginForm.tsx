'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';
const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

export default function AdminLoginForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInEmail = credential.user.email?.toLowerCase().trim();
      const expectedEmail = ADMIN_EMAIL.toLowerCase().trim();

      if (!expectedEmail || loggedInEmail !== expectedEmail) {
        // Immediately sign out — they are not the admin
        await signOut(auth);
        setError('Access Denied: Email does not match configured admin credentials.');
        setLoading(false);
        return;
      }

      // Credentials match — redirect to secure admin dashboard
      router.push(`/${ADMIN_ROUTE_KEY}/admin`);
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';

      if (code === 'auth/user-not-found' || msg.includes('user-not-found')) {
        setError(t.auth.adminNotRegistered || 'Admin account not yet registered — sign up with the admin email at /signup first.');
      } else if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        msg.includes('invalid-credential') ||
        msg.includes('wrong-password')
      ) {
        setError(t.auth.adminInvalidCredentials || 'No matching admin account, or incorrect password — if you haven\'t signed up yet, do so at /signup first.');
      } else if (code === 'auth/too-many-requests') {
        setError(t.auth.tooManyRequests || 'Too many failed login attempts. Please wait a moment and try again.');
      } else {
        setError(msg || 'Admin login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-500 to-navy-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-xl">🛡️</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t.admin.loginTitle}
          </h1>
          <p className="text-muted text-sm mt-2">
            {t.admin.loginSubtitle}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-elevated border border-border rounded-2xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Admin Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@arthasetu.gov.in"
              required
              autoComplete="email"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />

            <Input
              label={t.auth.password}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />

            {error && (
              <div className="p-3 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
            >
              {t.admin.loginButton}
            </Button>
          </form>
        </div>

        {/* Secondary Links */}
        <div className="flex items-center justify-between mt-6 text-xs text-muted">
          <Link
            href="/"
            className="hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            {t.admin.backHome}
          </Link>
          <Link
            href="/signup"
            className="text-primary hover:underline font-semibold"
          >
            {t.admin.registerLink}
          </Link>
        </div>
      </div>
    </main>
  );
}
