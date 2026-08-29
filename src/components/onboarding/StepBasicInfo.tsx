'use client';

import Input, { Select } from '@/components/ui/Input';
import { useLanguage } from '@/contexts/LanguageContext';
import { ALL_INDIAN_REGIONS } from '@/lib/firestore/users';
import type { UserProfile } from '@/types';

interface StepBasicInfoProps {
  data: Partial<UserProfile>;
  onChange: (fields: Partial<UserProfile>) => void;
  errors?: Record<string, string>;
}

export default function StepBasicInfo({ data, onChange, errors = {} }: StepBasicInfoProps) {
  const { t, setLanguage } = useLanguage();

  const stateOptions = [
    { value: '', label: t.onboarding.selectState },
    ...ALL_INDIAN_REGIONS.map((s) => ({ value: s, label: s })),
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <Input
        label={t.auth.name}
        type="text"
        value={data.name || ''}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="e.g. Ramesh Kumar"
        required
        error={errors.name}
      />

      {/* Language Preference */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          {t.onboarding.preferredLanguage}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              onChange({ language: 'en' });
              setLanguage('en');
            }}
            className={`
              py-2.5 px-4 rounded-xl border text-sm font-medium transition-all text-center
              ${data.language === 'en'
                ? 'border-primary bg-primary/10 text-primary font-semibold shadow-sm'
                : 'border-border bg-surface-elevated text-muted hover:border-muted'
              }
            `}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => {
              onChange({ language: 'hi' });
              setLanguage('hi');
            }}
            className={`
              py-2.5 px-4 rounded-xl border text-sm font-medium transition-all text-center
              ${data.language === 'hi'
                ? 'border-primary bg-primary/10 text-primary font-semibold shadow-sm'
                : 'border-border bg-surface-elevated text-muted hover:border-muted'
              }
            `}
          >
            हिंदी (Hindi)
          </button>
        </div>
      </div>

      {/* State & District */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label={t.onboarding.state}
          value={data.state || ''}
          onChange={(e) => onChange({ state: e.target.value })}
          options={stateOptions}
          error={errors.state}
          required
        />
        <Input
          label={t.onboarding.district}
          type="text"
          value={data.district || ''}
          onChange={(e) => onChange({ district: e.target.value })}
          placeholder={t.onboarding.districtPlaceholder}
          required
          error={errors.district}
        />
      </div>

      {/* Locality & PIN Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t.onboarding.locality}
          type="text"
          value={data.locality || ''}
          onChange={(e) => onChange({ locality: e.target.value })}
          placeholder={t.onboarding.localityPlaceholder}
          required
          error={errors.locality}
        />
        <Input
          label={t.onboarding.pinCode}
          type="text"
          value={data.pinCode || ''}
          onChange={(e) => onChange({ pinCode: e.target.value })}
          placeholder={t.onboarding.pinCodePlaceholder}
          error={errors.pinCode}
        />
      </div>
    </div>
  );
}
