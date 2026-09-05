'use client';

// NOTE: To customize the email template branding (sender name, logo, subject),
// configure Firebase Console > Authentication > Templates > Password reset.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Navbar from '@/components/layout/Navbar';
import Logo from '@/components/ui/Logo';

import Image from 'next/image';
import AmbientBackground from '@/components/ui/AmbientBackground';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');
  const { resetPassword } = useAuth();
  const { t } = useLanguage();
  const { quality } = useNetworkQuality();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
      setResendCooldown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset failed';
      if (msg.includes('user-not-found')) {
        setError('No account found with this email address.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending || !email) return;
    setResending(true);
    setResendMessage('');
    setError('');
    try {
      await resetPassword(email);
      setResendCooldown(60);
      setResendMessage(t.auth.resetSent || 'Password reset email sent! Check your inbox.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />
      <main className="flex-1 grid lg:grid-cols-2">
        <div className="relative flex items-center justify-center px-4 py-12 overflow-hidden">
          <AmbientBackground variant="subtle" />
          <div className="w-full max-w-md animate-slide-up">
            {/* Header */}
            <div className="text-center mb-8">
              <Logo size={56} className="mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground">
                {success ? (t.auth.checkEmailTitle || 'Check Your Email') : t.auth.forgotTitle}
              </h1>
              <p className="text-muted mt-2">
                {success
                  ? (t.auth.checkEmailSubtitle
                      ? t.auth.checkEmailSubtitle.replace('{email}', email)
                      : `We sent a password reset link to ${email}.`)
                  : t.auth.forgotSubtitle}
              </p>
            </div>

            {/* Form or Persistent Confirmation Box */}
            <div className="bg-surface-elevated border border-border rounded-2xl p-6 sm:p-8 shadow-lg">
              {success ? (
                <div className="text-center space-y-5 animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                    <svg className="w-4 h-4 text-saffron-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                    </svg>
                    <span className="font-mono truncate max-w-[260px]">{email}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs text-left flex items-start gap-2.5">
                    <span className="text-sm shrink-0">💡</span>
                    <p className="leading-relaxed">
                      {t.auth.checkSpamNotice || 'Did not receive it? Please check your spam or junk folder, or wait a minute before requesting another link.'}
                    </p>
                  </div>

                  {resendMessage && (
                    <div className="p-3 rounded-xl bg-success-light text-success text-xs font-medium animate-fade-in">
                      ✓ {resendMessage}
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-xl bg-danger-light text-danger text-xs font-medium animate-fade-in">
                      {error}
                    </div>
                  )}

                  <div className="pt-2 space-y-3">
                    <Button
                      variant="outline"
                      size="md"
                      className="w-full font-bold"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || resending}
                      isLoading={resending}
                    >
                      {resendCooldown > 0
                        ? (t.auth.resendCountdown
                            ? t.auth.resendCountdown.replace('{seconds}', resendCooldown.toString())
                            : `Resend link (${resendCooldown}s)`)
                        : (t.auth.sendAgain || 'Send link again')}
                    </Button>

                    <Link
                      href="/login"
                      className="inline-block text-xs sm:text-sm text-primary hover:text-primary-hover font-semibold transition-colors pt-2"
                    >
                      ← {t.nav.login}
                    </Link>
                  </div>
                </div>
              ) : (
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

                  {error && (
                    <div className="p-3 rounded-xl bg-danger-light text-danger text-sm">
                      {error}
                    </div>
                  )}

                  <Button type="submit" isLoading={loading} className="w-full" size="lg">
                    {t.auth.resetButton}
                  </Button>
                </form>
              )}
            </div>

            {/* Back to login */}
            {!success && (
              <p className="text-center text-sm text-muted mt-6">
                {t.auth.hasAccount}{' '}
                <Link href="/login" className="text-primary font-semibold hover:text-primary-hover transition-colors">
                  {t.nav.login}
                </Link>
              </p>
            )}
          </div>
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
    </div>
  );
}
