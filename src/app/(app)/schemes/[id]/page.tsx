'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AmbientBackground from '@/components/ui/AmbientBackground';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import TextToSpeechButton from '@/components/ui/TextToSpeechButton';
import DocumentChecklist from '@/components/schemes/DocumentChecklist';
import { getSchemeById } from '@/lib/firestore/schemes';
import { getUserProfile } from '@/lib/firestore/users';
import type { Scheme, UserProfile } from '@/types';

interface SchemeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SchemeDetailPage({ params }: SchemeDetailPageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const { language } = useLanguage();

  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // AI Plain-Language Explainer State
  const [explaining, setExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  useEffect(() => {
    async function loadScheme() {
      if (!id) return;
      try {
        const doc = await getSchemeById(id);
        setScheme(doc);

        if (user) {
          const userProf = await getUserProfile(user.uid);
          setProfile(userProf);
        }
      } catch (err) {
        console.error('Error loading scheme detail:', err);
      } finally {
        setLoading(false);
      }
    }

    loadScheme();
  }, [id, user]);

  const handleGenerateExplanation = async () => {
    if (!scheme || explaining) return;
    setExplaining(true);
    try {
      const response = await fetch('/api/schemes/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheme,
          userProfile: profile,
          language,
        }),
      });
      const data = await response.json();
      if (data.success && data.explanation) {
        setAiExplanation(data.explanation);
      }
    } catch (err) {
      console.error('Error fetching AI scheme explanation:', err);
    } finally {
      setExplaining(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-[80vh] flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted mt-3 animate-pulse">Loading Scheme Details...</p>
        </main>
      </>
    );
  }

  if (!scheme) {
    return (
      <>
        <Navbar />
        <main className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-danger-light text-danger flex items-center justify-center text-2xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-foreground">Scheme Not Found</h2>
          <p className="text-sm text-muted">
            The requested scheme record could not be found in the database.
          </p>
          <Link href="/schemes">
            <Button size="md">← Back to All Schemes</Button>
          </Link>
        </main>
      </>
    );
  }

  const isCentral = scheme.governmentLevel === 'central';
  const schemeSummarySpeech = `${scheme.name}. ${scheme.description}. Max subsidy is ${scheme.benefits.maxSubsidyPercent || 0} percent.`;

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        <AmbientBackground variant="subtle" />
        {/* Back Link */}
        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/schemes"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground transition-colors"
          >
            <span>←</span>
            <span>Back to Schemes Explorer</span>
          </Link>

          <TextToSpeechButton text={schemeSummarySpeech} size="sm" label="Read Scheme Overview" />
        </div>

        {/* Scheme Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-border pb-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`
                  px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                  ${isCentral
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }
                `}
              >
                {isCentral ? '🏛️ Central Government Scheme' : `📍 Government of ${scheme.state}`}
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface border border-border text-muted">
                {scheme.category}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              {scheme.name}
            </h1>

            <p className="text-sm text-muted leading-relaxed max-w-3xl">
              {scheme.description}
            </p>
          </div>

          <div className="flex sm:flex-col items-center gap-3 shrink-0">
            <a
              href={scheme.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button size="md" className="w-full justify-center font-bold">
                Official Portal ↗
              </Button>
            </a>

            <div className="text-[11px] text-muted text-right sm:text-center w-full">
              Verified: {scheme.lastVerifiedDate}
            </div>
          </div>
        </div>

        {/* AI Plain-Language Explainer Widget */}
        <Card padding="lg" className="border-saffron-300 dark:border-saffron-800 bg-surface-elevated space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-saffron-500 text-white">
                ✨ AI Assistant
              </span>
              <h3 className="text-base font-bold text-foreground">
                Plain-Language Scheme Breakdown
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {aiExplanation && (
                <TextToSpeechButton text={aiExplanation} size="sm" />
              )}
              {!aiExplanation && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerateExplanation}
                  isLoading={explaining}
                >
                  Explain For My Business →
                </Button>
              )}
            </div>
          </div>

          {aiExplanation ? (
            <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap pt-2 border-t border-border-subtle">
              {aiExplanation}
            </div>
          ) : (
            <p className="text-xs text-muted leading-relaxed">
              Click &ldquo;Explain For My Business&rdquo; to get a customized subsidy breakdown and step-by-step application guidance tailored to your location and enterprise.
            </p>
          )}
        </Card>

        {/* Benefits & Subsidies Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card padding="md" className="space-y-2">
            <span className="text-xs font-bold uppercase text-muted tracking-wider block">
              Subsidy Amount
            </span>
            <span className="text-xl font-black text-success block">
              {(scheme.benefits.maxSubsidyPercent || 0) > 0
                ? `${scheme.benefits.maxSubsidyPercent}% Subsidy`
                : '100% Credit Guarantee'}
            </span>
            <p className="text-xs text-muted leading-relaxed">
              {scheme.benefits.subsidyDetails || 'Contact nodal bank for specific margin guidelines.'}
            </p>
          </Card>

          <Card padding="md" className="space-y-2">
            <span className="text-xs font-bold uppercase text-muted tracking-wider block">
              Financing & Loan Limit
            </span>
            <span className="text-xl font-black text-foreground block">
              {scheme.benefits.maxFundingAmount
                ? `Up to ₹${(scheme.benefits.maxFundingAmount / 100000).toFixed(1)} Lakhs`
                : 'Project Linked'}
            </span>
            <p className="text-xs text-muted leading-relaxed">
              {scheme.benefits.loanDetails || 'Term loan and working capital linkage.'}
            </p>
          </Card>

          <Card padding="md" className="space-y-2">
            <span className="text-xs font-bold uppercase text-muted tracking-wider block">
              Additional Benefits
            </span>
            <ul className="space-y-1">
              {scheme.benefits.otherBenefits?.map((b, idx) => (
                <li key={idx} className="text-xs text-muted flex items-center gap-1.5">
                  <span className="text-primary font-bold">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Eligibility & Target Beneficiaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card padding="lg" className="space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>🎯</span>
              <span>Eligibility Conditions</span>
            </h3>

            <div className="space-y-2.5 text-xs text-muted">
              <div className="flex justify-between py-1.5 border-b border-border-subtle">
                <span className="font-semibold text-foreground">Age Requirement:</span>
                <span>{scheme.eligibility.ageRange || '18+ years'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border-subtle">
                <span className="font-semibold text-foreground">Income Limit:</span>
                <span>{scheme.eligibility.incomeLimit || 'No ceiling'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border-subtle">
                <span className="font-semibold text-foreground">Enterprise Status:</span>
                <span className="capitalize">{scheme.eligibility.businessStatus || 'Both new & existing'}</span>
              </div>

              {scheme.eligibility.otherConditions?.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <span className="font-semibold text-foreground block">Key Criteria:</span>
                  <ul className="space-y-1 pl-3 list-disc">
                    {scheme.eligibility.otherConditions.map((cond, idx) => (
                      <li key={idx} className="leading-relaxed">{cond}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {/* Step-by-Step Application Process */}
          <Card padding="lg" className="space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>🚀</span>
              <span>How to Apply</span>
            </h3>

            <div className="text-xs text-muted leading-relaxed whitespace-pre-wrap p-3.5 rounded-2xl bg-surface border border-border">
              {scheme.applicationProcess}
            </div>
          </Card>
        </div>

        {/* Feature 2: Interactive Document Preparation Checklist */}
        <DocumentChecklist scheme={scheme} />
      </main>
    </>
  );
}
