'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
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

        {/* Primary Action: Ask ArthaSetu */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-saffron-500 to-saffron-700 text-white shadow-xl hover:shadow-2xl transition-all cursor-pointer group" onClick={() => router.push('/advisor')}>
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
          <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {t.dashboard.aiReadyBadge}
              </div>
              <h2 className="text-2xl md:text-3xl font-black">{t.dashboard.askAI}</h2>
              <p className="text-saffron-50 text-sm md:text-base leading-relaxed">
                {t.dashboard.askAIFullDesc}
              </p>
            </div>
            <div className="shrink-0 w-full md:w-auto">
              <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-white text-saffron-600 px-6 py-4 rounded-2xl font-bold hover:bg-saffron-50 transition-colors shadow-lg active:scale-95 text-base sm:text-lg">
                <span>🎙️</span>
                {t.dashboard.openAdvisorCta}
              </button>
            </div>
          </div>
        </div>

        {/* Secondary / Manual Actions */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider ml-1">{t.dashboard.advancedToolsHeading}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard
              href="/planner"
              title={t.dashboard.createPlan}
              description={t.dashboard.createPlanDesc}
              icon="📊"
              badge={t.dashboard.manualEntryBadge}
              gradient="from-surface-elevated to-surface"
              ctaText={t.dashboard.openFormCta}
            />
            <ActionCard
              href="/schemes"
              title={t.dashboard.findSchemes}
              description={t.dashboard.findSchemesDesc}
              icon="🏛️"
              badge={t.dashboard.manualBrowseBadge}
              gradient="from-surface-elevated to-surface"
              ctaText={t.dashboard.browseSchemesCta}
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
    </>
  );
}
