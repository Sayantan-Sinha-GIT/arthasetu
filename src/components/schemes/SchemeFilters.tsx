'use client';

import Input, { Select } from '@/components/ui/Input';
import { ALL_INDIAN_REGIONS } from '@/lib/constants/states';
import { useLanguage } from '@/contexts/LanguageContext';

interface SchemeFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedState: string;
  onStateChange: (s: string) => void;
  selectedLevel: 'all' | 'central' | 'state';
  onLevelChange: (l: 'all' | 'central' | 'state') => void;
  totalCount: number;
}

export default function SchemeFilters({
  searchQuery,
  onSearchChange,
  selectedState,
  onStateChange,
  selectedLevel,
  onLevelChange,
  totalCount,
}: SchemeFiltersProps) {
  const { t } = useLanguage();

  const stateOptions = [
    { value: '', label: t.schemes.filters.allRegions },
    ...ALL_INDIAN_REGIONS.map((state) => ({
      value: state,
      label: state,
    })),
  ];

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-surface-elevated border border-border space-y-4 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Search Bar (6 cols) */}
        <div className="sm:col-span-6">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.schemes.searchPlaceholder}
            icon={
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        {/* State Filter (3 cols) */}
        <div className="sm:col-span-3">
          <Select
            value={selectedState}
            onChange={(e) => onStateChange(e.target.value)}
            options={stateOptions}
          />
        </div>

        {/* Level Toggle (3 cols) */}
        <div className="sm:col-span-3 flex items-center gap-1 bg-surface p-1 rounded-2xl border border-border">
          {(['all', 'central', 'state'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => onLevelChange(lvl)}
              className={`
                flex-1 py-1.5 rounded-xl text-xs font-bold capitalize transition-all
                ${selectedLevel === lvl
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
                }
              `}
            >
              {lvl === 'all' ? t.schemes.filters.all : lvl === 'central' ? t.schemes.central : t.schemes.state}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted pt-1">
        <span>{t.schemes.filters.showingCount.replace('{{count}}', totalCount.toString())}</span>
        <span className="text-[11px] italic">
          {t.schemes.filters.verifiedByNodal}
        </span>
      </div>
    </div>
  );
}
