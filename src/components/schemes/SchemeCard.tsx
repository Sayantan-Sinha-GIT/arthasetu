'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import TextToSpeechButton from '@/components/ui/TextToSpeechButton';
import TiltWrapper from '@/components/ui/TiltWrapper';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Scheme, SchemeMatchResult } from '@/types';

interface SchemeCardProps {
  scheme: Scheme;
  matchInfo?: SchemeMatchResult;
}

export default function SchemeCard({ scheme, matchInfo }: SchemeCardProps) {
  const { t } = useLanguage();
  const isCentral = scheme.governmentLevel === 'central';
  const schemeSummarySpeech = `${scheme.name}. ${scheme.description}. Max subsidy is ${scheme.benefits.maxSubsidyPercent || 0} percent.`;

  return (
    <TiltWrapper maxTilt={8} className="h-full">
      <Card
        padding="lg"
        className="relative overflow-hidden flex flex-col justify-between space-y-4 glass border-border/40 hover:border-primary/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group h-full rounded-3xl"
      >
      {/* Category Accent Indicator Top Bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          isCentral
            ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600'
            : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600'
        }`}
      />

      <div className="space-y-3 pt-1">
        {/* Top Badges Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`
                px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                ${isCentral
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }
              `}
            >
              {isCentral ? '🏛️ Central Scheme' : `📍 ${scheme.state} State`}
            </span>

            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface text-muted border border-border">
              {scheme.category || 'Micro-Enterprise'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Match Score Badge (if in personalized matched mode) */}
            {matchInfo && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-saffron-500 text-white shadow-sm flex items-center gap-1">
                <span>⚡</span>
                <span>{matchInfo.matchScore}% Match</span>
              </span>
            )}
            <TextToSpeechButton text={schemeSummarySpeech} size="sm" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
            {scheme.name}
          </h3>
          <span className="text-xs font-semibold text-muted">
            ({scheme.shortName})
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-muted leading-relaxed line-clamp-2">
          {scheme.description}
        </p>

        {/* Subsidy / Benefit Highlight Pill */}
        <div className="p-3 rounded-2xl bg-surface border border-border space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted font-medium">{t.schemes.subsidyBenefit}:</span>
            <span className="font-bold text-success text-xs sm:text-sm">
              {(scheme.benefits.maxSubsidyPercent || 0) > 0
                ? `${t.schemes.upTo} ${scheme.benefits.maxSubsidyPercent}% ${t.schemes.subsidy}`
                : t.schemes.collateralFree}
            </span>
          </div>

          {scheme.benefits.maxFundingAmount && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted font-medium">{t.schemes.maxFunding}:</span>
              <span className="font-bold text-foreground">
                ₹{(scheme.benefits.maxFundingAmount / 100000).toFixed(1)} {t.schemes.lakhs}
              </span>
            </div>
          )}
        </div>

        {/* Match Reasons (if available) */}
        {matchInfo && matchInfo.matchReasons.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold uppercase text-muted tracking-wider block">
              {t.schemes.whyMatches}:
            </span>
            <ul className="space-y-1">
              {matchInfo.matchReasons.slice(0, 2).map((reason, idx) => (
                <li key={idx} className="text-xs text-muted flex items-center gap-1.5">
                  <span className="text-success font-bold text-[10px]">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer Meta & Action */}
      <div className="pt-3 border-t border-border-subtle space-y-3">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span className="truncate max-w-[180px]">🏛️ {scheme.sourceName}</span>
          <span title={t.schemes.lastVerifiedTooltip}>
            📅 {t.schemes.verified}: {scheme.lastVerifiedDate}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/schemes/${scheme.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full justify-center">
              View Eligibility & Details →
            </Button>
          </Link>

          <a
            href={scheme.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl border border-border bg-surface hover:bg-surface-elevated text-muted hover:text-foreground transition-colors shrink-0"
            title="Open official government portal"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </Card>
    </TiltWrapper>
  );
}
