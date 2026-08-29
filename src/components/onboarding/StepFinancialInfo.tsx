'use client';

import Input from '@/components/ui/Input';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UserProfile } from '@/types';

interface StepFinancialInfoProps {
  data: Partial<UserProfile>;
  onChange: (fields: Partial<UserProfile>) => void;
  errors?: Record<string, string>;
}

export default function StepFinancialInfo({ data, onChange, errors = {} }: StepFinancialInfoProps) {
  const { t } = useLanguage();

  const handleNumericChange = (key: keyof UserProfile, valStr: string) => {
    const clean = valStr.replace(/[^0-9]/g, '');
    const num = clean === '' ? 0 : parseInt(clean, 10);
    onChange({ [key]: num });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-surface p-4 rounded-xl border border-border-subtle mb-4 text-xs text-muted leading-relaxed">
        💡 <strong className="text-foreground">Why we ask this:</strong> Your available capital and funding needs help us match specific subsidy brackets and loan ranges under schemes like PMEGP, MUDRA, and state credit programs.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t.onboarding.availableCapital}
          type="text"
          value={data.availableCapital ? data.availableCapital.toString() : ''}
          onChange={(e) => handleNumericChange('availableCapital', e.target.value)}
          placeholder={t.onboarding.availableCapitalPlaceholder}
          required
          error={errors.availableCapital}
          hint="Your personal savings or current business capital"
        />

        <Input
          label={t.onboarding.desiredFunding}
          type="text"
          value={data.desiredFunding ? data.desiredFunding.toString() : ''}
          onChange={(e) => handleNumericChange('desiredFunding', e.target.value)}
          placeholder={t.onboarding.desiredFundingPlaceholder}
          required
          error={errors.desiredFunding}
          hint="Estimated loan or subsidy required"
        />
      </div>

      {data.businessStatus === 'existing' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
          <Input
            label={t.onboarding.monthlyIncome}
            type="text"
            value={data.monthlyIncome ? data.monthlyIncome.toString() : ''}
            onChange={(e) => handleNumericChange('monthlyIncome', e.target.value)}
            placeholder={t.onboarding.monthlyIncomePlaceholder}
            error={errors.monthlyIncome}
          />
          <Input
            label={t.onboarding.monthlyExpenses}
            type="text"
            value={data.monthlyExpenses ? data.monthlyExpenses.toString() : ''}
            onChange={(e) => handleNumericChange('monthlyExpenses', e.target.value)}
            placeholder={t.onboarding.monthlyExpensesPlaceholder}
            error={errors.monthlyExpenses}
          />
        </div>
      )}
    </div>
  );
}
