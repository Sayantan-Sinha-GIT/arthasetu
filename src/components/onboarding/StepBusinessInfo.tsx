'use client';

import Input, { Select } from '@/components/ui/Input';
import { useLanguage } from '@/contexts/LanguageContext';
import { BUSINESS_CATEGORIES, EXPERIENCE_LEVELS } from '@/lib/firestore/users';
import type { UserProfile } from '@/types';

interface StepBusinessInfoProps {
  data: Partial<UserProfile>;
  onChange: (fields: Partial<UserProfile>) => void;
  errors?: Record<string, string>;
}

export default function StepBusinessInfo({ data, onChange, errors = {} }: StepBusinessInfoProps) {
  const { t } = useLanguage();

  const categoryOptions = [
    { value: '', label: t.onboarding.selectCategory },
    ...BUSINESS_CATEGORIES.map((c) => ({ value: c, label: c })),
  ];

  const experienceOptions = [
    { value: '', label: t.onboarding.selectExperience },
    ...EXPERIENCE_LEVELS.map((exp) => ({ value: exp, label: exp })),
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Business Status Toggle */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          {t.onboarding.businessStatus}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ businessStatus: 'planning' })}
            className={`
              p-4 rounded-xl border text-left transition-all flex items-start gap-3
              ${data.businessStatus === 'planning'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-surface-elevated hover:border-muted'
              }
            `}
          >
            <span className="text-xl">🌱</span>
            <div>
              <div className="text-sm font-bold text-foreground">
                {t.onboarding.planningBusiness}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {t.onboarding.planningBusinessDesc}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ businessStatus: 'existing' })}
            className={`
              p-4 rounded-xl border text-left transition-all flex items-start gap-3
              ${data.businessStatus === 'existing'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-surface-elevated hover:border-muted'
              }
            `}
          >
            <span className="text-xl">🏪</span>
            <div>
              <div className="text-sm font-bold text-foreground">
                {t.onboarding.existingBusiness}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {t.onboarding.existingBusinessDesc}
              </p>
            </div>
          </button>
        </div>
        {errors.businessStatus && (
          <p className="text-xs text-danger">{errors.businessStatus}</p>
        )}
      </div>

      {/* Category & Experience */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label={t.onboarding.businessCategory}
          value={data.businessCategory || ''}
          onChange={(e) => onChange({ businessCategory: e.target.value })}
          options={categoryOptions}
          error={errors.businessCategory}
          required
        />
        <Select
          label={t.onboarding.businessExperience}
          value={data.businessExperience || ''}
          onChange={(e) => onChange({ businessExperience: e.target.value })}
          options={experienceOptions}
          error={errors.businessExperience}
        />
      </div>

      {/* Business Type / Product Name */}
      <Input
        label={t.onboarding.businessType}
        type="text"
        value={data.businessType || ''}
        onChange={(e) => onChange({ businessType: e.target.value })}
        placeholder={t.onboarding.businessTypePlaceholder}
        required
        error={errors.businessType}
        hint="Be as specific as possible (e.g., Backyard Poultry, Saree Weaving, Mobile Repair)"
      />
    </div>
  );
}
