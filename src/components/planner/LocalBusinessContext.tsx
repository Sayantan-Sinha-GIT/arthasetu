'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';

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
              Local &amp; Seasonal Business Context
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              Regional Insights
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Operational and climate considerations for <span className="font-semibold text-foreground">{cleanBusiness}</span> in <span className="font-semibold text-foreground">{cleanLocation}</span>
          </p>
        </div>
      </div>

      {/* MANDATORY PROMINENT DISCLAIMER */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
        <span className="text-base shrink-0">🤖</span>
        <div>
          <p className="font-bold text-[11px] uppercase tracking-wider">
            AI-Estimated General Guidance — Not Verified Local Data
          </p>
          <p className="mt-0.5 text-xs opacity-90">
            These operational insights and seasonal patterns are estimated using AI general knowledge. Always verify current prices, market demand, and local regulations with your nearest Mandi, District Industries Centre (DIC), or Krishi Vigyan Kendra (KVK).
          </p>
        </div>
      </div>

      {/* Season Selector Tabs */}
      <div className="flex items-center gap-2 text-xs">
        {[
          { id: 'festive_winter', label: '🎉 Festive / Peak Season' },
          { id: 'monsoon', label: '🌧️ Monsoon & Wet Season' },
          { id: 'summer', label: '☀️ Summer / Lean Season' },
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
            <h4>Estimated Demand Fluctuations</h4>
          </div>
          <p className="text-muted leading-relaxed">
            {activeSeason === 'festive_winter'
              ? `Demand for ${cleanBusiness} in ${cleanLocation} typically surges by 25–40% during wedding and festival cycles (Diwali, Chhath, Bihu, Pongal, Eid). Plan excess working capital 30 days in advance.`
              : activeSeason === 'monsoon'
              ? `Monsoon months often bring temporary road transit delays and local weekly haat slowdowns. Maintain a 15-day raw material inventory buffer.`
              : `Summer lean months require aggressive local relationship management and cash flow budgeting to bridge low-demand weeks.`}
          </p>
        </div>

        {/* 2. Supply Chain & Raw Materials */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span>📦</span>
            <h4>Input Sourcing &amp; Mandi Logistics</h4>
          </div>
          <p className="text-muted leading-relaxed">
            Source raw materials directly from wholesale district distributors or farmer-producer cooperatives (FPOs) rather than retail intermediaries to safeguard a 15–20% gross margin advantage.
          </p>
        </div>

        {/* 3. Utility & Infrastructure Precautions */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span>⚡</span>
            <h4>Power, Water &amp; Storage Precautions</h4>
          </div>
          <p className="text-muted leading-relaxed">
            Rural grid power fluctuations can cause machinery downtime or livestock mortality. Factor in solar rooftop subsidies (PM Surya Ghar) or a diesel backup generator in your CapEx proposal.
          </p>
        </div>

        {/* 4. Local Market Linkages */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span>🤝</span>
            <h4>Institutional &amp; SHG Linkages</h4>
          </div>
          <p className="text-muted leading-relaxed">
            Partner with local Self-Help Groups (SHGs), Gram Panchayats, or District MSME facilitation cells to secure bulk local institutional orders and government tender preference.
          </p>
        </div>
      </div>
    </Card>
  );
}
