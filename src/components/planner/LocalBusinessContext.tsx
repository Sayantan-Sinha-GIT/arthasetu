'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { useLanguage } from '@/contexts/LanguageContext';

interface LocalBusinessContextProps {
  businessType: string;
  location: string;
  className?: string;
}

export default function LocalBusinessContext({
  businessType,
  location,
  className = '',
}: LocalBusinessContextProps) {
  const { t } = useLanguage();
  const [activeSeason, setActiveSeason] = useState<'summer' | 'monsoon' | 'festive_winter'>('festive_winter');

  const cleanLocation = location?.trim() || 'Rural / Semi-Urban India';
  const cleanBusiness = businessType?.trim() || 'Micro Enterprise';

  return (
    <Card padding="lg" className={`space-y-5 border-amber-500/30 bg-surface-elevated shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌾</span>
            <h3 className="text-base font-bold text-foreground">
              {t.planner.localBusinessContext.title}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              {t.planner.localBusinessContext.regionalInsights}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {t.planner.localBusinessContext.subtitleContext.replace('{{business}}', cleanBusiness).replace('{{location}}', cleanLocation)}
          </p>
        </div>
      </div>

      {/* MANDATORY PROMINENT DISCLAIMER */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
        <span className="text-base shrink-0">🤖</span>
        <div>
          <p className="font-bold text-[11px] uppercase tracking-wider">
            {t.planner.localBusinessContext.disclaimerTitle}
          </p>
          <p className="mt-0.5 text-xs opacity-90">
            {t.planner.localBusinessContext.disclaimerDesc}
          </p>
        </div>
      </div>

      {/* Season Selector Tabs */}
      <div className="flex items-center gap-2 text-xs">
        {[
          { id: 'festive_winter', label: t.planner.localBusinessContext.festiveSeason },
          { id: 'monsoon', label: t.planner.localBusinessContext.monsoonSeason },
          { id: 'summer', label: t.planner.localBusinessContext.summerSeason },
        ].map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSeason(s.id as any)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeSeason === s.id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 4 Pillar Context Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* 1. Demand Patterns */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span>📈</span>
            <h4>{t.planner.localBusinessContext.demandFluctuations}</h4>
          </div>
          <p className="text-muted leading-relaxed">
            {activeSeason === 'festive_winter'
              ? t.planner.localBusinessContext.demandFestiveDesc.replace('{{business}}', cleanBusiness).replace('{{location}}', cleanLocation)
              : activeSeason === 'monsoon'
              ? t.planner.localBusinessContext.demandMonsoonDesc
              : t.planner.localBusinessContext.demandSummerDesc}
          </p>
        </div>

        {/* 2. Supply Chain & Raw Materials */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span>📦</span>
            <h4>{t.planner.localBusinessContext.inputSourcing}</h4>
          </div>
          <p className="text-muted leading-relaxed">
            {t.planner.localBusinessContext.inputSourcingDesc}
          </p>
        </div>

        {/* 3. Utility & Infrastructure Precautions */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span>⚡</span>
            <h4>{t.planner.localBusinessContext.powerPrecautions}</h4>
          </div>
          <p className="text-muted leading-relaxed">
            {t.planner.localBusinessContext.powerPrecautionsDesc}
          </p>
        </div>

        {/* 4. Local Market Linkages */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span>🤝</span>
            <h4>{t.planner.localBusinessContext.shgLinkages}</h4>
          </div>
          <p className="text-muted leading-relaxed">
            {t.planner.localBusinessContext.shgLinkagesDesc}
          </p>
        </div>
      </div>
    </Card>
  );
}
