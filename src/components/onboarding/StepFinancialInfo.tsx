'use client';

import { NumberInput } from '@/components/ui/Input';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UserProfile } from '@/types';

interface StepFinancialInfoProps {
  data: Partial<UserProfile>;
  onChange: (fields: Partial<UserProfile>) => void;
  errors?: Record<string, string>;
}

export default function StepFinancialInfo({ data, onChange, errors = {} }: StepFinancialInfoProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-surface p-4 rounded-xl border border-border-subtle mb-4 text-xs text-muted leading-relaxed">
        💡 <strong className="text-foreground">Why we ask this:</strong> Your available capital and funding needs help us match specific subsidy brackets and loan ranges under schemes like PMEGP, MUDRA, and state credit programs.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NumberInput
          label={t.onboarding.availableCapital}
          value={data.availableCapital !== undefined ? data.availableCapital : ''}
          onValueChange={(val) => onChange({ availableCapital: val })}
          placeholder={t.onboarding.availableCapitalPlaceholder}
          required
          min={0}
          error={errors.availableCapital}
          hint="Your personal savings or current business capital"
        />

        <NumberInput
          label={t.onboarding.desiredFunding}
          value={data.desiredFunding !== undefined ? data.desiredFunding : ''}
          onValueChange={(val) => onChange({ desiredFunding: val })}
          placeholder={t.onboarding.desiredFundingPlaceholder}
          required
          min={0}
          error={errors.desiredFunding}
          hint="Estimated loan or subsidy required"
        />
      </div>

      {data.businessStatus === 'existing' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
          <NumberInput
            label={t.onboarding.monthlyIncome}
            value={data.monthlyIncome !== undefined ? data.monthlyIncome : ''}
            onValueChange={(val) => onChange({ monthlyIncome: val })}
            placeholder={t.onboarding.monthlyIncomePlaceholder}
            min={0}
            error={errors.monthlyIncome}
          />
          <NumberInput
            label={t.onboarding.monthlyExpenses}
            value={data.monthlyExpenses !== undefined ? data.monthlyExpenses : ''}
            onValueChange={(val) => onChange({ monthlyExpenses: val })}
            placeholder={t.onboarding.monthlyExpensesPlaceholder}
            min={0}
            error={errors.monthlyExpenses}
          />
        </div>
      )}
    </div>
  );
}
