'use client';

import Input, { Select } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { GENDERS } from '@/lib/firestore/users';
import type { UserProfile } from '@/types';

interface StepEligibilityProps {
  data: Partial<UserProfile>;
  onChange: (fields: Partial<UserProfile>) => void;
  errors?: Record<string, string>;
}

export default function StepEligibility({ data, onChange, errors = {} }: StepEligibilityProps) {
  const { t } = useLanguage();

  const genderOptions = [
    { value: '', label: t.onboarding.selectGender },
    ...GENDERS.map((g) => ({ value: g, label: g })),
  ];

  const handleNumericChange = (key: keyof UserProfile, valStr: string) => {
    const clean = valStr.replace(/[^0-9]/g, '');
    const num = clean === '' ? 0 : parseInt(clean, 10);
    onChange({ [key]: num });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-surface p-4 rounded-xl border border-border-subtle mb-4 text-xs text-muted leading-relaxed">
        📋 <strong className="text-foreground">Optional Details:</strong> Many government schemes offer higher subsidies (up to 35%) for women, youth, and specific demographic categories. You can complete this now or later from your Profile.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DatePicker
          label={t.onboarding.dob}
          value={data.dob || ''}
          onChange={(dob) => onChange({ dob })}
          error={errors.dob}
          helperText={t.onboarding.dobPlaceholder}
        />
        <Select
          label={t.onboarding.gender}
          value={data.gender || ''}
          onChange={(e) => onChange({ gender: e.target.value })}
          options={genderOptions}
          error={errors.gender}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t.onboarding.employeeCount}
          type="text"
          value={data.employeeCount ? data.employeeCount.toString() : ''}
          onChange={(e) => handleNumericChange('employeeCount', e.target.value)}
          placeholder={t.onboarding.employeeCountPlaceholder}
          hint="Including yourself and family members"
        />

        <Input
          label={t.onboarding.annualTurnover}
          type="text"
          value={data.annualTurnover ? data.annualTurnover.toString() : ''}
          onChange={(e) => handleNumericChange('annualTurnover', e.target.value)}
          placeholder={t.onboarding.annualTurnoverPlaceholder}
          hint="Estimated yearly revenue (if existing)"
        />
      </div>

      {/* Existing Loan Toggle */}
      <div className="pt-2">
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border bg-surface-elevated hover:border-muted">
          <input
            type="checkbox"
            checked={!!data.existingLoans}
            onChange={(e) => onChange({ existingLoans: e.target.checked })}
            className="w-4 h-4 rounded text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-foreground">
            {t.onboarding.existingLoans}
          </span>
        </label>
      </div>
    </div>
  );
}
