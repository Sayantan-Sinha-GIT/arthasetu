'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import ActionCard from '@/components/dashboard/ActionCard';
import ProfileCompleteness from '@/components/dashboard/ProfileCompleteness';
import RecentPlans from '@/components/dashboard/RecentPlans';
import RecentAdvice from '@/components/dashboard/RecentAdvice';
import GraminScoreCard from '@/components/dashboard/GraminScoreCard';
import SchemeDeadlinesCard from '@/components/dashboard/SchemeDeadlinesCard';
import { getUserProfile } from '@/lib/firestore/users';
import type { UserProfile } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
    const adminRouteKey = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

    if (user && user.email?.trim().toLowerCase() === adminEmail) {
      router.push(`/${adminRouteKey}/admin`);
      return;
    }

    async function loadDashboardData() {
      if (!user) return;
      try {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          setProfile(userProfile);
        } else {
          // If no profile found, redirect to onboarding
          router.push('/onboarding');
        }
      } catch (err) {
        console.error('Error loading dashboard profile:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-[80vh] flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted mt-3 animate-pulse">{t.common.loading}</p>
        </main>
        <Footer />
      </>
    );
  }

  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || '';

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        {/* Welcome & Business Summary Banner */}
        <WelcomeBanner profile={profile} userName={displayName} />

        {/* Section: 3 Primary Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              {t.dashboard.quickActions}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Action 1: Ask ArthaSetu */}
            <ActionCard
              href="/advisor"
              title={t.dashboard.askAI}
              description={t.dashboard.askAIDesc}
              icon="🎙️"
              badge="Voice + Text"
              gradient="from-saffron-400 to-saffron-600"
              ctaText="Open Advisor"
            />

            {/* Action 2: Create Financial Plan */}
            <ActionCard
              href="/planner"
              title={t.dashboard.createPlan}
              description={t.dashboard.createPlanDesc}
              icon="📊"
              badge="Deterministic Math"
              gradient="from-primary to-accent"
              ctaText="Build Plan"
            />

            {/* Action 3: Government Schemes */}
            <ActionCard
              href="/schemes"
              title={t.dashboard.findSchemes}
              description={t.dashboard.findSchemesDesc}
              icon="🏛️"
              badge="Central & State"
              gradient="from-navy-500 to-navy-700"
              ctaText="Check Eligibility"
            />
          </div>
        </div>

        {/* Section: Gramin Credit Readiness Score (300-900) */}
        <GraminScoreCard profile={profile} />

        {/* Section: Government Scheme Deadlines & Cycles Tracker */}
        <SchemeDeadlinesCard />

        {/* Bottom 2-Column Section: Widgets & Previews */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (1/3): Profile Completeness Tracker */}
          <div className="lg:col-span-1 space-y-6">
            <ProfileCompleteness profile={profile} />
          </div>

          {/* Right Column (2/3): Recent Plans & Recent Advice */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <RecentPlans userId={user?.uid || ''} />
            <RecentAdvice userId={user?.uid || ''} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
