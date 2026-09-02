'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AmbientBackground from '@/components/ui/AmbientBackground';
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
  const [matchedSearchQuery, setMatchedSearchQuery] = useState('');
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
    const results = matchSchemesForProfile(schemes, profile);
    if (!matchedSearchQuery.trim()) return results;
    
    const q = matchedSearchQuery.toLowerCase();
    return results.filter(item => {
      const s = item.scheme;
      return (
        s.name.toLowerCase().includes(q) ||
        s.shortName.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
      );
    });
  }, [schemes, profile, matchedSearchQuery]);

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
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="relative flex-1 min-h-0 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 space-y-10 overflow-y-auto">
        <AmbientBackground variant="subtle" />
        {/* Header */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-foreground flex items-center gap-4 tracking-tighter uppercase leading-[0.9]">
              <span className="text-5xl sm:text-6xl text-primary drop-shadow-[0_0_15px_rgba(255,119,0,0.4)]">🏛️</span>
              <span>{t.schemes.title}</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-serif max-w-2xl">
              {t.schemes.subtitle}
            </p>
          </div>

          {profile && (
            <div className="flex flex-col gap-1 items-start sm:items-end self-start sm:self-center">
              <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">{t.schemes.targetingProfileLabel}</span>
              <div className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-surface/50 border border-border/50 text-foreground uppercase tracking-widest backdrop-blur-md shadow-inner">
                <span className="text-primary">👤</span>
                <span>{profile.businessType || t.schemes.defaultEnterprise}</span>
                <span className="text-border">•</span>
                <span>{profile.state || t.schemes.defaultIndia}</span>
              </div>
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
            <span>{t.schemes.tabMatchedForProfile}</span>
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
            <span>{t.schemes.tabAllDirectory}</span>
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

                  {/* Matched Schemes Search Bar */}
                  <div className="relative max-w-md">
                    <input
                      type="text"
                      placeholder={t.schemes.searchWithinMatchedPlaceholder}
                      value={matchedSearchQuery}
                      onChange={(e) => setMatchedSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
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
                    {t.schemes.noMatchTitle}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
                    {t.schemes.noMatchDesc}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setActiveTab('all')}
                  >
                    {t.schemes.browseAllCta}
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
    </>
  );
}
