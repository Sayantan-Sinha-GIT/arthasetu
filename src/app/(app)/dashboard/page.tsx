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
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
};

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
      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 space-y-12"
      >
        {/* Welcome & Business Summary Banner */}
        <motion.div variants={itemVariants}>
          <WelcomeBanner profile={profile} userName={displayName} />
        </motion.div>

        {/* Primary Action: Ask ArthaSetu */}
        <motion.div variants={itemVariants}>
          <div 
            onClick={() => router.push('/advisor')}
            className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-2xl hover:shadow-[0_0_40px_rgba(255,119,0,0.3)] transition-all cursor-pointer group border border-primary-hover/50"
          >
            {/* Cinematic Gradient Backdrop */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-orange-900 group-hover:scale-105 transition-transform duration-700" />
            
            {/* Massive background text */}
            <div className="absolute -right-20 -bottom-20 text-[200px] font-display font-black text-white/5 leading-none select-none pointer-events-none tracking-tighter">
              AI
            </div>

            <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="space-y-6 max-w-3xl">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold tracking-widest uppercase backdrop-blur-md border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {t.dashboard.aiReadyBadge}
                </div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tighter uppercase leading-[0.9]">
                  {t.dashboard.askAI}
                </h2>
                <p className="text-white/80 text-lg md:text-xl font-medium leading-relaxed max-w-xl">
                  {t.dashboard.askAIFullDesc}
                </p>
              </div>
              <div className="shrink-0 w-full md:w-auto">
                <button className="w-full md:w-auto flex items-center justify-center gap-3 bg-white text-primary px-8 py-5 rounded-2xl font-bold hover:bg-surface transition-colors shadow-xl active:scale-95 text-lg uppercase tracking-widest">
                  <span>🎙️</span>
                  {t.dashboard.openAdvisorCta}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Secondary / Manual Actions */}
        <motion.div variants={itemVariants} className="space-y-6">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">{t.dashboard.advancedToolsHeading}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </motion.div>

        {/* Section: Gramin Credit Readiness Score */}
        <motion.div variants={itemVariants}>
          <GraminScoreCard profile={profile} />
        </motion.div>

        {/* Section: Government Scheme Deadlines */}
        <motion.div variants={itemVariants}>
          <SchemeDeadlinesCard />
        </motion.div>

        {/* Bottom 2-Column Section: Widgets & Previews */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <ProfileCompleteness profile={profile} />
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <RecentPlans userId={user?.uid || ''} />
            <RecentAdvice userId={user?.uid || ''} />
          </div>
        </motion.div>
      </motion.main>
    </>
  );
}
