'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { auth } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AmbientBackground from '@/components/ui/AmbientBackground';

const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

export default function VerifyEmailPage() {
  const { user, loading, isAdmin, resendVerification, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 1. Route guarding: if not logged in -> /login, if already verified or admin -> app
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
    } else if (isAdmin) {
      router.replace(`/${ADMIN_ROUTE_KEY}/admin`);
    } else if (user.emailVerified) {
      router.replace('/onboarding');
    }
  }, [user, loading, isAdmin, router]);

  // 2. Poll user.reload() every 5 seconds to auto-redirect upon verification
  useEffect(() => {
    if (loading || !user || user.emailVerified || isAdmin) return;

    const interval = setInterval(async () => {
      try {
        if (auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            setMessage(t.auth.verifiedRedirecting || 'Email verified! Redirecting...');
            router.replace('/onboarding');
          }
        }
      } catch (err) {
        console.warn('Error polling email verification status:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, loading, isAdmin, router, t.auth.verifiedRedirecting]);

  // 3. Countdown timer handler for resend button
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setError('');
    setMessage('');
    setResending(true);

    try {
      await resendVerification();
      setCountdown(60);
      setMessage(t.auth.resendSuccess || 'Verification email resent successfully! Check your inbox.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend email';
      if (msg.includes('too-many-requests')) {
        setError(t.auth.tooManyRequests || 'Too many attempts. Please wait before trying again.');
        setCountdown(60);
      } else {
        setError(msg);
      }
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <AmbientBackground variant="subtle" />

        <div className="w-full max-w-lg animate-slide-up relative z-10">
          {/* Main Card */}
          <div className="bg-surface-elevated border border-border rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 text-center">
            {/* Animated Mail Icon */}
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-3xl bg-saffron-500/20 animate-ping opacity-50" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-saffron-500 to-saffron-600 flex items-center justify-center shadow-xl shadow-saffron-500/25">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {t.auth.verifyEmailTitle || 'Verify Your Email'}
              </h1>
              <p className="text-sm sm:text-base text-muted max-w-md mx-auto">
                {t.auth.verifyEmailSubtitle
                  ? t.auth.verifyEmailSubtitle.replace('{email}', user?.email || '')
                  : `We sent a verification link to ${user?.email || 'your email address'}. Please check your inbox (and spam folder), then refresh or wait for automatic confirmation.`}
              </p>
            </div>

            {/* Target Email Highlight Box */}
            <div className="bg-surface border border-border rounded-2xl p-3.5 flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
              <svg className="w-4 h-4 text-saffron-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
              </svg>
              <span className="font-mono text-xs sm:text-sm truncate max-w-[280px]">
                {user?.email || 'you@example.com'}
              </span>
            </div>

            {/* Status Messages */}
            {message && (
              <div className="p-3.5 rounded-xl bg-success-light text-success text-xs sm:text-sm font-medium flex items-center justify-center gap-2 animate-fade-in">
                <span>✓</span>
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-danger-light text-danger text-xs sm:text-sm font-medium animate-fade-in">
                {error}
              </div>
            )}

            {/* Polling indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted">
              <span className="inline-block w-2 h-2 rounded-full bg-saffron-500 animate-pulse" />
              <span>{t.auth.autoChecking || 'Checking for verification in background (every 5s)...'}</span>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full font-bold"
                onClick={handleResend}
                disabled={countdown > 0 || resending}
                isLoading={resending}
              >
                {countdown > 0
                  ? (t.auth.resendCountdown
                      ? t.auth.resendCountdown.replace('{seconds}', countdown.toString())
                      : `Resend email (${countdown}s)`)
                  : (t.auth.resendEmail || 'Resend verification email')}
              </Button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center text-xs sm:text-sm font-medium text-muted hover:text-foreground transition-colors py-2"
              >
                ← {t.auth.logout || 'Log out / Switch account'}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
