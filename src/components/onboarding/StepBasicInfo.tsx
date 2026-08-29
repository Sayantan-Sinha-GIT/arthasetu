'use client';

import Input, { Select } from '@/components/ui/Input';
import { useLanguage } from '@/contexts/LanguageContext';
import { ALL_INDIAN_REGIONS } from '@/lib/firestore/users';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import type { UserProfile } from '@/types';

interface StepBasicInfoProps {
  data: Partial<UserProfile>;
  onChange: (fields: Partial<UserProfile>) => void;
  errors?: Record<string, string>;
}

export default function StepBasicInfo({ data, onChange, errors = {} }: StepBasicInfoProps) {
  const { t, setLanguage, language } = useLanguage();

  const stateOptions = [
    { value: '', label: t.onboarding.selectState },
    ...ALL_INDIAN_REGIONS.map((s) => ({ value: s, label: s })),
  ];

  const languageOptions = SUPPORTED_LANGUAGES.map((l) => ({
    value: l.code,
    label: `${l.nativeName} (${l.name})${l.isMachineTranslated ? ' — AI' : ''}`,
  }));

  const handleLanguageChange = (code: string) => {
    onChange({ language: code });
    setLanguage(code);
  };

  const handlePinChange = (pin: string) => {
    // Only accept numeric digits up to 6
    const clean = pin.replace(/[^0-9]/g, '').slice(0, 6);
    onChange({ pinCode: clean });
  };

  const pinError =
    errors.pinCode ||
    (data.pinCode && data.pinCode.length > 0 && !/^[1-9][0-9]{5}$/.test(data.pinCode)
      ? 'PIN code must be 6 digits and cannot start with 0'
      : undefined);

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

      {/* Preferred Language - Full 23-Language Selector */}
      <div className="space-y-1.5">
        <Select
          label={`🌐 ${t.onboarding.preferredLanguage} (23 Languages)`}
          value={data.language || language || 'en'}
          onChange={(e) => handleLanguageChange(e.target.value)}
          options={languageOptions}
          required
        />
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
          onChange={(e) => handlePinChange(e.target.value)}
          placeholder={t.onboarding.pinCodePlaceholder}
          error={pinError}
          maxLength={6}
        />
      </div>
    </div>
  );
}
