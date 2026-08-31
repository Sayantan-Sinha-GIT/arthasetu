'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import AmbientBackground from '@/components/ui/AmbientBackground';
import type { UserProfile } from '@/types';

interface WelcomeBannerProps {
  profile: Partial<UserProfile> | null;
  userName: string;
}

export default function WelcomeBanner({ profile, userName }: WelcomeBannerProps) {
  const { t } = useLanguage();

  const businessType = profile?.businessType;
  const status = profile?.businessStatus;
  const state = profile?.state;
  const locality = profile?.locality;
  const district = profile?.district;

  const isCapitalSet = typeof profile?.availableCapital === 'number';
  const isFundingSet = typeof profile?.desiredFunding === 'number';
  const isExpensesSet = typeof profile?.monthlyExpenses === 'number';
  const isIncomeSet = typeof profile?.monthlyIncome === 'number';

  const monthlyIncome = isIncomeSet ? profile.monthlyIncome! : 0;
  const monthlyExpenses = isExpensesSet ? profile.monthlyExpenses! : 0;
  const hasCashFlowData = isIncomeSet || isExpensesSet;
  const netCashFlow = monthlyIncome - monthlyExpenses;

  let locationText = '';
  if (locality && district && state) {
    locationText = `${locality}, ${district}, ${state}`;
  } else if (state) {
    locationText = district ? `${district}, ${state}` : state;
  } else {
    locationText = t.dashboard.locationNotSet;
  }

  const statusBadge =
    status === 'existing'
      ? t.dashboard.statusExisting
      : status === 'planning'
      ? t.dashboard.statusPlanning
      : '';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 text-white p-4 sm:p-8 border border-navy-700 shadow-xl">
      {/* Ambient background atmosphere */}
      <AmbientBackground variant="card" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-4 flex-1 min-w-0">
          {/* Greeting */}
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">🙏</span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
              {t.dashboard.welcome}{' '}
              <span className="text-saffron-300 font-extrabold">{userName || t.dashboard.guest}</span>
            </h1>
          </div>

          {/* One-line business summary */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {statusBadge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-saffron-400/20 text-saffron-300 border border-saffron-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-saffron-400" />
                {statusBadge}
              </span>
            )}

            {businessType ? (
              <span className="text-sm font-medium text-slate-200 break-words">
                {businessType}
              </span>
            ) : (
              <span className="text-sm text-slate-300 italic">
                {t.dashboard.noBusinessSpecified}
              </span>
            )}

            <span className="text-slate-400 text-sm">•</span>

            <span className="text-xs sm:text-sm text-slate-300 flex items-center gap-1 break-words">
              <svg className="w-3.5 h-3.5 text-saffron-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {locationText}
            </span>
          </div>

          {/* Financial & Cash Flow Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
            {/* Capital */}
            <div className="bg-navy-950/70 p-2.5 sm:p-3 rounded-2xl border border-navy-700/80 space-y-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">{t.dashboard.availableCapital}</span>
                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono shrink-0">
                  {t.dashboard.userTag}
                </span>
              </div>
              {isCapitalSet ? (
                <p className="text-sm sm:text-base font-bold text-white truncate">
                  ₹{profile!.availableCapital!.toLocaleString('en-IN')}
                </p>
              ) : (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white underline font-medium pt-1"
                >
                  <span>Not set</span>
                  <span className="text-[10px]">→</span>
                </Link>
              )}
            </div>

            {/* Desired Funding */}
            <div className="bg-navy-950/70 p-2.5 sm:p-3 rounded-2xl border border-navy-700/80 space-y-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">{t.dashboard.desiredFunding}</span>
                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono shrink-0">
                  {t.dashboard.userTag}
                </span>
              </div>
              {isFundingSet ? (
                <p className="text-sm sm:text-base font-bold text-saffron-300 truncate">
                  ₹{profile!.desiredFunding!.toLocaleString('en-IN')}
                </p>
              ) : (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1 text-xs text-saffron-400/80 hover:text-saffron-300 underline font-medium pt-1"
                >
                  <span>Not set</span>
                  <span className="text-[10px]">→</span>
                </Link>
              )}
            </div>

            {/* Monthly Expenses */}
            <div className="bg-navy-950/70 p-2.5 sm:p-3 rounded-2xl border border-navy-700/80 space-y-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">{t.dashboard.monthlyExpenses}</span>
                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono shrink-0">
                  {t.dashboard.userTag}
                </span>
              </div>
              {isExpensesSet ? (
                <p className="text-sm sm:text-base font-bold text-slate-200 truncate">
                  ₹{profile!.monthlyExpenses!.toLocaleString('en-IN')}
                </p>
              ) : (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white underline font-medium pt-1"
                >
                  <span>Not set</span>
                  <span className="text-[10px]">→</span>
                </Link>
              )}
            </div>

            {/* Net Cash Flow (App Calculated) */}
            <div className="bg-navy-950/70 p-2.5 sm:p-3 rounded-2xl border border-navy-700/80 space-y-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">{t.dashboard.netCashFlow}</span>
                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono shrink-0">
                  {t.dashboard.appCalcTag}
                </span>
              </div>
              {hasCashFlowData ? (
                <p className={`text-sm sm:text-base font-bold truncate ${netCashFlow >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                  {netCashFlow >= 0 ? '+' : ''}₹{netCashFlow.toLocaleString('en-IN')}/mo
                </p>
              ) : (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white underline font-medium pt-1"
                >
                  <span>Not set</span>
                  <span className="text-[10px]">→</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Quick Edit Profile CTA */}
        <div className="shrink-0 flex items-center gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 backdrop-blur-md transition-all shadow-sm active:scale-95"
          >
            <svg className="w-4 h-4 text-saffron-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>{t.common.edit} {t.nav.profile}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
