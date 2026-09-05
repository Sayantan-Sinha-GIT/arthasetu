'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Navbar from '@/components/layout/Navbar';
import Logo from '@/components/ui/Logo';

import Image from 'next/image';
import AmbientBackground from '@/components/ui/AmbientBackground';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { t, language } = useLanguage();
  const { quality } = useNetworkQuality();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const user = await signup(name, email, password);
      const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
      const adminRouteKey = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

      // If signing up with the configured admin email, bypass onboarding and profile doc creation
      if (email.trim().toLowerCase() === adminEmail) {
        router.push(`/${adminRouteKey}/admin`);
        return;
      }

      // Create initial user profile in Firestore for regular users
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        email,
        language,
        theme: 'light',
        state: '',
        district: '',
        locality: '',
        pinCode: '',
        businessStatus: '',
        businessCategory: '',
        businessType: '',
        businessExperience: '',
        availableCapital: 0,
        desiredFunding: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        onboardingComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push('/verify-email');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed';
      if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists.');
      } else if (msg.includes('weak-password')) {
        setError('Password is too weak. Use at least 6 characters.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
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
              <h1 className="text-2xl font-bold text-foreground">{t.auth.signupTitle}</h1>
              <p className="text-muted mt-2">{t.auth.signupSubtitle}</p>
            </div>

            {/* Form */}
            <div className="bg-surface-elevated border border-border rounded-2xl p-6 shadow-lg">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label={t.auth.name}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ramesh Kumar"
                  required
                  autoComplete="name"
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />

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
                  autoComplete="new-password"
                  hint={t.auth.passwordHint}
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />

                <Input
                  label={t.auth.confirmPassword}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  }
                />

                {error && (
                  <div className="p-3 rounded-xl bg-danger-light text-danger text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                <Button type="submit" isLoading={loading} className="w-full" size="lg">
                  {t.auth.signupButton}
                </Button>
              </form>
            </div>

            {/* Login link */}
            <p className="text-center text-sm text-muted mt-6">
              {t.auth.hasAccount}{' '}
              <Link href="/login" className="text-primary font-semibold hover:text-primary-hover transition-colors">
                {t.nav.login}
              </Link>
            </p>
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
