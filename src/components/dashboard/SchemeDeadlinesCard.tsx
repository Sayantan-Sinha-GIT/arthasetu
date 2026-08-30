'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';

interface SchemeDeadlineItem {
  id: string;
  schemeName: string;
  shortName: string;
  agency: string;
  cycleTitle: string;
  deadlineDate: string; // e.g. "30 Sep 2026"
  daysRemaining: number;
  status: 'closing_soon' | 'open' | 'rolling';
  subsidyBenefit: string;
  portalUrl?: string;
  schemeLink: string;
}

const SCHEME_DEADLINES: SchemeDeadlineItem[] = [
  {
    id: 'pmegp_cycle_1',
    schemeName: 'Prime Minister’s Employment Generation Programme (PMEGP)',
    shortName: 'PMEGP',
    agency: 'KVIC / Ministry of MSME',
    cycleTitle: 'FY 2026-27 Q2 Project Appraisal Tranche',
    deadlineDate: '30 Sep 2026',
    daysRemaining: 28,
    status: 'closing_soon',
    subsidyBenefit: 'Up to 35% Capital Subsidy (Max ₹50 Lakh Manufacturing / ₹20 Lakh Service)',
    portalUrl: 'https://www.kviconline.gov.in/pmegpeportal',
    schemeLink: '/schemes',
  },
  {
    id: 'nlm_poultry_dairy',
    schemeName: 'National Livestock Mission (NLM) Sub-Mission on Breed Development',
    shortName: 'NLM Sub-Mission',
    agency: 'DAHD / Ministry of Fisheries & Animal Husbandry',
    cycleTitle: 'Autumn 2026 Application Window',
    deadlineDate: '15 Oct 2026',
    daysRemaining: 45,
    status: 'open',
    subsidyBenefit: '50% Capital Subsidy for Broiler, Layer Poultry & Goat Units',
    portalUrl: 'https://nlm.udyamimitra.in',
    schemeLink: '/schemes',
  },
  {
    id: 'mudra_q3',
    schemeName: 'Pradhan Mantri MUDRA Yojana (PMMY)',
    shortName: 'MUDRA',
    agency: 'Department of Financial Services (DFS)',
    cycleTitle: 'Quarterly Bank Branch Credit Mobilization Drive',
    deadlineDate: 'Rolling Tranche',
    daysRemaining: 90,
    status: 'rolling',
    subsidyBenefit: 'Collateral-Free Working Capital & Term Loans up to ₹10 Lakhs',
    portalUrl: 'https://www.mudra.org.in',
    schemeLink: '/schemes',
  },
  {
    id: 'pm_vishwakarma',
    schemeName: 'PM Vishwakarma Scheme for Traditional Artisans',
    shortName: 'PM Vishwakarma',
    agency: 'Ministry of MSME & Ministry of Skill Development',
    cycleTitle: 'Artisan Verification & ₹15,000 Toolkit Disbursement',
    deadlineDate: 'Continuous Rolling',
    daysRemaining: 180,
    status: 'rolling',
    subsidyBenefit: '₹15,000 Free Toolkit Grant + 5% Subsidized Enterprise Loan',
    portalUrl: 'https://pmvishwakarma.gov.in',
    schemeLink: '/schemes',
  },
];

export default function SchemeDeadlinesCard() {
  const [reminders, setReminders] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('arthasetu_scheme_reminders');
      if (saved) {
        try {
          setReminders(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  const toggleReminder = (id: string) => {
    setReminders((prev) => {
      const next = prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id];
      if (typeof window !== 'undefined') {
        localStorage.setItem('arthasetu_scheme_reminders', JSON.stringify(next));
      }
      return next;
    });
  };

  return (
    <Card padding="md" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⏳</span>
            <h3 className="text-base font-bold text-foreground">
              Government Scheme Application Cycles &amp; Deadlines
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-saffron-500/10 text-saffron-700 dark:text-saffron-300 border border-saffron-500/20">
              Example Cycles
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Overview of central and state scheme subsidy cycles to plan your application timeline
          </p>
        </div>

        <Link
          href="/schemes"
          className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
        >
          <span>View All Schemes</span>
          <span>→</span>
        </Link>
      </div>

      {/* Indicative Disclaimer Banner */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
        <span className="text-base shrink-0">ℹ️</span>
        <div>
          <p className="font-bold text-[11px] uppercase tracking-wider">
            Illustrative Example Cycle — Dates Are Indicative, Not Live-Tracked
          </p>
          <p className="mt-0.5 text-xs opacity-90">
            Confirm the actual current deadline on each scheme’s official portal before applying.
          </p>
        </div>
      </div>

      {/* Deadlines List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCHEME_DEADLINES.map((item) => {
          const hasReminder = reminders.includes(item.id);
          const isUrgent = item.status === 'closing_soon';

          return (
            <div
              key={item.id}
              className={`
                p-4 rounded-2xl border space-y-3 flex flex-col justify-between transition-all
                ${isUrgent
                  ? 'bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/20'
                  : 'bg-surface border-border hover:border-primary/30'
                }
              `}
            >
              <div className="space-y-2 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      {item.agency}
                    </span>
                    <h4 className="text-sm font-bold text-foreground mt-0.5 leading-snug break-words">
                      {item.schemeName}
                    </h4>
                  </div>

                  {/* Softened Status Badge */}
                  <span
                    className={`
                      self-start sm:shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold
                      ${item.status === 'closing_soon'
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30'
                        : item.status === 'open'
                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/30'
                      }
                    `}
                  >
                    {item.status === 'closing_soon'
                      ? `Example: ~${item.daysRemaining}d typical cycle`
                      : item.status === 'open'
                      ? `Example: ~${item.daysRemaining}d typical window`
                      : 'Rolling / Continuous Window'
                    }
                  </span>
                </div>

                <p className="text-xs text-muted font-medium">
                  {item.cycleTitle}
                </p>

                {/* Subsidy Benefit Callout */}
                <div className="p-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-[11px] text-foreground flex items-center gap-2">
                  <span className="text-saffron-500 shrink-0">💰</span>
                  <span className="font-semibold leading-tight">{item.subsidyBenefit}</span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-xs">
                <button
                  type="button"
                  onClick={() => toggleReminder(item.id)}
                  className={`
                    inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all
                    ${hasReminder
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted hover:text-foreground bg-surface-elevated border border-border'
                    }
                  `}
                >
                  <span>{hasReminder ? '🔔' : '🔕'}</span>
                  <span>{hasReminder ? 'Reminder Set' : 'Set Reminder'}</span>
                </button>

                {item.portalUrl ? (
                  <a
                    href={item.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>Official Portal</span>
                    <span>↗</span>
                  </a>
                ) : (
                  <Link
                    href={item.schemeLink}
                    className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>Read Details</span>
                    <span>→</span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
