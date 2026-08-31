'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { auth } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

function LoginFormContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAccountDeleted = searchParams.get('deleted') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();

      let hasAdminClaim = false;
      if (auth.currentUser) {
        try {
          const tokenRes = await auth.currentUser.getIdTokenResult();
          hasAdminClaim = !!tokenRes.claims.admin;
        } catch {
          // Ignore token result fetch error
        }
      }

      const isUserAdmin = (adminEmail && email.trim().toLowerCase() === adminEmail) || hasAdminClaim;

      if (isUserAdmin) {
        // Terminate any session created on the public login page
        await logout();
        setError(t.auth.adminDetectedMessage || 'Administrative account detected. Please use the dedicated secure admin login portal to sign in.');
        return;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Login error:', err);
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError(t.errors.invalidInput || 'Invalid email or password. Please try again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-saffron-500/20">
          <span className="text-white font-bold text-xl">अ</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t.auth.loginTitle}</h1>
        <p className="text-muted mt-2">{t.auth.loginSubtitle}</p>
      </div>

      {/* Account Deleted Banner */}
      {isAccountDeleted && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5 animate-fade-in shadow-sm">
          <span className="text-base shrink-0">✅</span>
          <div>
            <p className="font-bold text-sm">{t.auth.accountDeletedTitle}</p>
            <p className="mt-0.5 opacity-90">
              {t.auth.accountDeletedDesc}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-surface-elevated border border-border rounded-2xl p-6 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t.auth.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
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

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              {t.auth.forgotPassword}
            </Link>
          </div>

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
            {t.auth.loginButton}
          </Button>
        </form>
      </div>

      {/* Footer link */}
      <p className="text-center text-sm text-muted mt-6">
        {t.auth.noAccount}{' '}
        <Link href="/signup" className="text-primary font-semibold hover:underline">
          {t.nav.signup}
        </Link>
      </p>
    </div>
  );
}

import Image from 'next/image';
import AmbientBackground from '@/components/ui/AmbientBackground';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';

export default function LoginPage() {
  const { t } = useLanguage();
  const { quality } = useNetworkQuality();

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 grid lg:grid-cols-2">
        <div className="relative flex items-center justify-center px-4 py-12 overflow-hidden">
          <AmbientBackground variant="subtle" />
          <Suspense fallback={<div className="w-full max-w-md h-96 flex items-center justify-center text-xs text-muted">Loading...</div>}>
            <LoginFormContent />
          </Suspense>
        </div>
        <div className="hidden lg:block relative overflow-hidden bg-surface-elevated">
          {quality !== 'minimal' ? (
            <Image
              src="/images/login-hero.webp"
              alt="Indian woman micro-entrepreneur in a cotton saree working at her self-help group enterprise"
              fill
              priority
              className={`object-cover ${quality === 'full' ? 'animate-kenburns' : ''}`}
              sizes="50vw"
            />
          ) : (
            <AmbientBackground variant="hero" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent" />
          <div className="grain-overlay" />
          <div className="absolute bottom-12 left-12 right-12 text-white">
            <p className="text-2xl font-black leading-snug">
              &ldquo;{t.auth.quoteText || "Your business deserves a plan as ambitious as you are."}&rdquo;
            </p>
            <p className="mt-3 text-sm text-white/70 font-mono uppercase tracking-widest">
              {t.appName} — {t.auth.quoteSubtext || "Built for India's Real Economy"}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
