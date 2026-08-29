'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import SchemeCard from '@/components/schemes/SchemeCard';
import SchemeFilters from '@/components/schemes/SchemeFilters';
import { getAllSchemes, seedSchemesToFirestore } from '@/lib/firestore/schemes';
import { getUserProfile } from '@/lib/firestore/users';
import { matchSchemesForProfile } from '@/lib/schemes/matcher';
import type { Scheme, SchemeMatchResult, UserProfile } from '@/types';

export default function SchemesPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'matched' | 'all'>('matched');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'central' | 'state'>('all');

  useEffect(() => {
    async function loadData() {
      try {
        // Load schemes
        const list = await getAllSchemes();
        setSchemes(list);

        // Load profile if user is logged in
        if (user) {
          const userProf = await getUserProfile(user.uid);
          if (userProf) {
            setProfile(userProf);
            // Default state filter to user state if available
            if (userProf.state) {
              setSelectedState(userProf.state);
            }
          }
        }
      } catch (err) {
        console.error('Error loading schemes data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadData();
    }
  }, [user, authLoading]);

  // Deterministic matches for the user's profile
  const matchedResults = useMemo(() => {
    if (!profile) return [];
    return matchSchemesForProfile(schemes, profile);
  }, [schemes, profile]);

  // Filtered list for "All Schemes" directory
  const filteredSchemes = useMemo(() => {
    return schemes.filter((s) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          s.name.toLowerCase().includes(q) ||
          s.shortName.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.targetBusinessTypes.some((t) => t.toLowerCase().includes(q)) ||
          s.category?.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // 2. State Filter
      if (selectedState) {
        const isCentral = s.governmentLevel === 'central';
        const matchesState = s.state?.toLowerCase() === selectedState.toLowerCase();
        if (!isCentral && !matchesState) return false;
      }

      // 3. Level Filter
      if (selectedLevel !== 'all' && s.governmentLevel !== selectedLevel) {
        return false;
      }

      return true;
    });
  }, [schemes, searchQuery, selectedState, selectedLevel]);

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
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2">
              <span>🏛️</span>
              <span>Government Schemes & Subsidies</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Verified Central and State government financial assistance programs with deterministic eligibility matching
            </p>
          </div>

          {profile && (
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-surface border border-border text-muted">
              <span>👤 Profile:</span>
              <span className="text-foreground">{profile.businessType || 'Enterprise'}</span>
              <span>•</span>
              <span className="text-foreground">{profile.state || 'India'}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 border-b border-border pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('matched')}
            className={`
              pb-3 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'matched'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
              }
            `}
          >
            <span>⚡ Matched For Your Profile</span>
            {matchedResults.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                {matchedResults.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`
              pb-3 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
              }
            `}
          >
            <span>📚 All Schemes Directory</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-surface text-muted border border-border">
              {schemes.length}
            </span>
          </button>
        </div>

        {/* TAB 1: MATCHED SCHEMES */}
        {activeTab === 'matched' && (
          <div className="space-y-6">
            {profile ? (
              matchedResults.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-saffron-50/50 dark:bg-saffron-950/20 border border-saffron-300 dark:border-saffron-800 text-xs leading-relaxed text-foreground">
                    🎯 Found <strong>{matchedResults.length} verified schemes</strong> matching your profile (
                    <strong>{profile.businessType || profile.businessCategory}</strong> in <strong>{profile.state}</strong>).
                    Ranked by relevance and local subsidy benefits.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matchedResults.map((item) => (
                      <SchemeCard
                        key={item.scheme.id}
                        scheme={item.scheme}
                        matchInfo={item}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* Unsupported Profile / No Matches Case */
                <div className="text-center py-16 px-6 bg-surface-elevated rounded-3xl border border-dashed border-border space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-surface border border-border text-muted flex items-center justify-center text-3xl mx-auto">
                    🔍
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    No Verified Matching Schemes Found
                  </h3>
                  <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
                    We did not find a verified government scheme specifically matching your current criteria in our verified database. ArthaSetu never invents unverified schemes.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setActiveTab('all')}
                  >
                    Browse All Central & State Schemes →
                  </Button>
                </div>
              )
            ) : (
              /* Not Logged In / Incomplete Profile State */
              <div className="text-center py-16 px-6 bg-surface-elevated rounded-3xl border border-border space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl mx-auto">
                  👤
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Complete Your Profile for Automatic Scheme Matching
                </h3>
                <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
                  Fill in your state, district, and business category to let our deterministic engine match eligible Central and State subsidies for your venture.
                </p>
                <Link href="/onboarding">
                  <Button size="md">Complete Business Profile →</Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ALL SCHEMES DIRECTORY */}
        {activeTab === 'all' && (
          <div className="space-y-6">
            <SchemeFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedState={selectedState}
              onStateChange={setSelectedState}
              selectedLevel={selectedLevel}
              onLevelChange={setSelectedLevel}
              totalCount={filteredSchemes.length}
            />

            {filteredSchemes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchemes.map((scheme) => (
                  <SchemeCard key={scheme.id} scheme={scheme} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-6 bg-surface-elevated rounded-3xl border border-border text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl mx-auto">
                  🏛️
                </div>
                <p className="text-base font-bold text-foreground">
                  {selectedState
                    ? `State-Level Data for ${selectedState} is Currently Being Indexed`
                    : 'No schemes match your filter criteria'}
                </p>
                <p className="text-xs sm:text-sm text-muted max-w-lg mx-auto">
                  {selectedState
                    ? `Verified state-specific schemes for ${selectedState} are currently being audited and added by administrators. All nationwide Central Government schemes (such as PMEGP, MUDRA, and Stand-Up India) remain fully active and applicable in ${selectedState}.`
                    : 'Try adjusting your search keywords, selected state, or government level filter.'}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedState('');
                    setSelectedLevel('all');
                  }}
                >
                  Reset All Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
