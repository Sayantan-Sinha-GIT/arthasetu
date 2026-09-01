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
  const hasCashFlowData = isIncomeSet && isExpensesSet;
  const netCashFlow = hasCashFlowData ? (monthlyIncome - monthlyExpenses) : 0;

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
    <div className="relative overflow-hidden rounded-3xl bg-[#0B0806] text-[#FDF5E3] p-6 sm:p-10 border border-[#3A291D] shadow-2xl transition-all duration-500">
      {/* Ambient background atmosphere - forced dark */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#1E3A6E]/30 rounded-full blur-[80px] mix-blend-screen pointer-events-none -translate-x-1/4 translate-y-1/4" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
        <div className="space-y-6 flex-1 min-w-0">
          {/* Greeting */}
          <div className="flex items-center gap-3">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-black tracking-tighter break-words uppercase text-white leading-[0.9]">
              {t.dashboard.welcome}
              <br/>
              <span className="text-primary">{userName || t.dashboard.guest}</span>
            </h1>
          </div>

          {/* One-line business summary */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {statusBadge && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {statusBadge}
              </span>
            )}

            {businessType ? (
              <span className="text-sm font-bold text-white/80 break-words uppercase tracking-wider">
                {businessType}
              </span>
            ) : (
              <span className="text-sm text-white/40 italic">
                {t.dashboard.noBusinessSpecified}
              </span>
            )}

            <span className="text-white/20 text-sm">•</span>

            <span className="text-xs sm:text-sm text-white/60 flex items-center gap-1.5 break-words font-medium">
              <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {locationText}
            </span>
          </div>

          {/* Financial & Cash Flow Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-6">
            {/* Capital */}
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3 min-w-0 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-xs text-white/50 font-bold tracking-[0.2em] uppercase truncate">{t.dashboard.availableCapital}</span>
                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono shrink-0">
                  {t.dashboard.userTag}
                </span>
              </div>
              {isCapitalSet ? (
                <p className="text-lg sm:text-xl font-bold text-white truncate">
                  ₹{profile!.availableCapital!.toLocaleString('en-IN')}
                </p>
              ) : (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1 text-xs text-white/30 hover:text-primary underline font-bold pt-1 uppercase tracking-wider"
                >
                  <span>N/A</span>
                  <span className="text-[10px]">→</span>
                </Link>
              )}
            </div>

            {/* Desired Funding */}
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3 min-w-0 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-xs text-white/50 font-bold tracking-[0.2em] uppercase truncate">{t.dashboard.desiredFunding}</span>
                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono shrink-0">
                  {t.dashboard.userTag}
                </span>
              </div>
              {isFundingSet ? (
                <p className="text-lg sm:text-xl font-bold text-primary truncate">
                  ₹{profile!.desiredFunding!.toLocaleString('en-IN')}
                </p>
              ) : (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1 text-xs text-primary/50 hover:text-primary underline font-bold pt-1 uppercase tracking-wider"
                >
                  <span>N/A</span>
                  <span className="text-[10px]">→</span>
                </Link>
              )}
            </div>

            {/* Monthly Expenses */}
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3 min-w-0 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-xs text-white/50 font-bold tracking-[0.2em] uppercase truncate">{t.dashboard.monthlyExpenses}</span>
                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono shrink-0">
                  {t.dashboard.userTag}
                </span>
              </div>
              {isExpensesSet ? (
                <p className="text-lg sm:text-xl font-bold text-white truncate">
                  ₹{profile!.monthlyExpenses!.toLocaleString('en-IN')}
                </p>
              ) : (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1 text-xs text-white/30 hover:text-primary underline font-bold pt-1 uppercase tracking-wider"
                >
                  <span>N/A</span>
                  <span className="text-[10px]">→</span>
                </Link>
              )}
            </div>

            {/* Net Cash Flow (App Calculated) */}
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3 min-w-0 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-xs text-white/50 font-bold tracking-[0.2em] uppercase truncate">{t.dashboard.netCashFlow}</span>
                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono shrink-0">
                  {t.dashboard.appCalcTag}
                </span>
              </div>
              {hasCashFlowData ? (
                <p className={`text-lg sm:text-xl font-bold truncate ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netCashFlow >= 0 ? '+' : ''}₹{netCashFlow.toLocaleString('en-IN')}/mo
                </p>
              ) : (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1 text-xs text-white/30 hover:text-primary underline font-bold pt-1 uppercase tracking-wider"
                >
                  <span>N/A</span>
                  <span className="text-[10px]">→</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Quick Edit Profile CTA */}
        <div className="shrink-0 pt-4 md:pt-0">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-white/5 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all shadow-sm active:scale-95 uppercase tracking-widest"
          >
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>{t.common.edit} {t.nav.profile}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
