'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
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
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <span>🎙️</span>
              <span>{t.advisor.title}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              {t.advisor.subtitle}
            </p>
          </div>

          {profile?.state && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface border border-border text-muted">
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
      <Footer />
    </>
  );
}
