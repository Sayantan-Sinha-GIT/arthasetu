'use client';

import { Select, NumberInput } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { GENDERS } from '@/lib/firestore/users';
import { GENDER_KEYS } from '@/lib/constants/profile-options';
import type { UserProfile, LoanDetail } from '@/types';

interface StepEligibilityProps {
  data: Partial<UserProfile>;
  onChange: (fields: Partial<UserProfile>) => void;
  errors?: Record<string, string>;
}

export default function StepEligibility({ data, onChange, errors = {} }: StepEligibilityProps) {
  const { t } = useLanguage();

  const genderOptions = [
    { value: '', label: t.onboarding.selectGender },
    // Stored in English, shown in the user's language.
    ...GENDERS.map((g) => ({ value: g, label: (t.onboarding.genderOptions as Record<string, string> | undefined)?.[GENDER_KEYS[g]] || g })),
  ];

  const lenderOptions = [
    { value: 'bank', label: t.graminScore.bank || 'Commercial Bank (SBI, PNB, etc.)' },
    { value: 'nbfc', label: t.graminScore.nbfc || 'NBFC / Microfinance (MFI)' },
    { value: 'shg_cooperative', label: t.graminScore.shg || 'SHG / Cooperative Credit Society' },
    { value: 'informal', label: t.graminScore.moneylender || 'Informal / Private Lender' },
  ];

  const loans = data.loanDetails || [];

  const handleToggleLoans = (checked: boolean) => {
    if (checked) {
      const initialLoans: LoanDetail[] = loans.length > 0 ? loans : [
        {
          id: `loan_${Date.now()}`,
          lenderType: 'bank',
          outstandingAmount: 0,
          monthlyEmi: 0,
        },
      ];
      onChange({ existingLoans: true, loanDetails: initialLoans });
    } else {
      onChange({ existingLoans: false, loanDetails: [] });
    }
  };

  const handleAddLoan = () => {
    const newLoan: LoanDetail = {
      id: `loan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lenderType: 'bank',
      outstandingAmount: 0,
      monthlyEmi: 0,
    };
    onChange({ loanDetails: [...loans, newLoan] });
  };

  const handleUpdateLoan = (id: string, updates: Partial<LoanDetail>) => {
    const updated = loans.map((l) => (l.id === id ? { ...l, ...updates } : l));
    onChange({ loanDetails: updated });
  };

  const handleRemoveLoan = (id: string) => {
    const remaining = loans.filter((l) => l.id !== id);
    onChange({
      loanDetails: remaining,
      existingLoans: remaining.length > 0,
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-surface p-4 rounded-xl border border-border-subtle mb-4 text-xs text-muted leading-relaxed">
        📋 <strong className="text-foreground">{t.onboarding.optionalDetails}:</strong> {t.onboarding.optionalDetailsDesc}
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
        <NumberInput
          label={t.onboarding.employeeCount}
          value={data.employeeCount !== undefined ? data.employeeCount : ''}
          onValueChange={(val) => onChange({ employeeCount: val })}
          placeholder={t.onboarding.employeeCountPlaceholder}
          min={0}
          hint={t.onboarding.employeeCountHint || 'Including yourself'}
        />

        <NumberInput
          label={t.onboarding.annualTurnover}
          value={data.annualTurnover !== undefined ? data.annualTurnover : ''}
          onValueChange={(val) => onChange({ annualTurnover: val })}
          placeholder={t.onboarding.annualTurnoverPlaceholder}
          hint={t.onboarding.turnoverHint}
        />
      </div>

      {/* Existing Loan Toggle & Expandable Details */}
      <div className="space-y-3 pt-2">
        <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-xl border border-border bg-surface-elevated hover:border-muted transition-all">
          <input
            type="checkbox"
            checked={!!data.existingLoans}
            onChange={(e) => handleToggleLoans(e.target.checked)}
            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
          />
          <span className="text-sm font-semibold text-foreground">
            {t.onboarding.existingLoans}
          </span>
        </label>

        {data.existingLoans && (
          <div className="p-4 rounded-2xl bg-surface border border-border space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <span className="text-xs font-bold text-foreground">
                {t.onboarding.activeLoanDetails} ({loans.length})
              </span>
              <button
                type="button"
                onClick={handleAddLoan}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>➕</span>
                <span>{t.onboarding.addAnotherLoan}</span>
              </button>
            </div>

            {loans.map((loan, idx) => (
              <div
                key={loan.id}
                className="p-3.5 rounded-xl bg-surface-elevated border border-border space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-muted">
                  <span>{t.onboarding.loanNumber}{idx + 1}</span>
                  {loans.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLoan(loan.id)}
                      className="text-danger hover:underline text-xs font-semibold"
                    >
                      ✕ {t.onboarding.remove}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select
                    label={t.onboarding.lenderType}
                    value={loan.lenderType}
                    onChange={(e) => handleUpdateLoan(loan.id, { lenderType: e.target.value as LoanDetail['lenderType'] })}
                    options={lenderOptions}
                  />

                  <NumberInput
                    label={t.onboarding.outstandingBalance}
                    value={loan.outstandingAmount !== undefined ? loan.outstandingAmount : ''}
                    onValueChange={(val) => handleUpdateLoan(loan.id, { outstandingAmount: val })}
                    placeholder="e.g. 50000"
                    min={0}
                  />

                  <NumberInput
                    label={t.onboarding.monthlyEmi}
                    value={loan.monthlyEmi !== undefined ? loan.monthlyEmi : ''}
                    onValueChange={(val) => handleUpdateLoan(loan.id, { monthlyEmi: val })}
                    placeholder="e.g. 2500"
                    min={0}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
