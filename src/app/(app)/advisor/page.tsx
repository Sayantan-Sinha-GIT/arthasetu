'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AmbientBackground from '@/components/ui/AmbientBackground';
import ChatInterface from '@/components/advisor/ChatInterface';
import { getUserProfile } from '@/lib/firestore/users';
import type { UserProfile } from '@/types';

export default function AdvisorPage() {
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

    async function loadAdvisor() {
      if (!user) return;
      try {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          setProfile(userProfile);
        }
      } catch (err) {
        console.error('Error loading advisor profile:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadAdvisor();
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

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-[#0B0806] border border-[#3A291D] shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent mix-blend-screen pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white flex items-center gap-4 tracking-tighter uppercase">
              <span className="text-4xl sm:text-5xl">🎙️</span>
              <span>{t.advisor.title}</span>
            </h1>
            <p className="text-sm sm:text-base text-white/70 font-serif">
              {t.advisor.subtitle}
            </p>
          </div>

          {profile?.state && (
            <div className="relative z-10 self-start sm:self-center flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white/80 uppercase tracking-widest backdrop-blur-md">
              <span>📍</span>
              <span>{profile.district ? `${profile.district}, ${profile.state}` : profile.state}</span>
            </div>
          )}
        </div>

        {/* Conversational Interface */}
        <ChatInterface
          userProfile={profile}
          userId={user?.uid || ''}
        />
      </main>
    </>
  );
}
