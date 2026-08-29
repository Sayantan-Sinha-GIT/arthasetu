'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
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

  return (
    <>
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-saffron-500/20">
              <span className="text-white font-bold text-xl">अ</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t.auth.forgotTitle}</h1>
            <p className="text-muted mt-2">{t.auth.forgotSubtitle}</p>
          </div>

          {/* Form */}
          <div className="bg-surface-elevated border border-border rounded-2xl p-6 shadow-lg">
            {success ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-foreground font-medium">{t.auth.resetSent}</p>
                <Link
                  href="/login"
                  className="inline-block text-sm text-primary hover:text-primary-hover font-semibold transition-colors"
                >
                  ← {t.nav.login}
                </Link>
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
          <p className="text-center text-sm text-muted mt-6">
            {t.auth.hasAccount}{' '}
            <Link href="/login" className="text-primary font-semibold hover:text-primary-hover transition-colors">
              {t.nav.login}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
