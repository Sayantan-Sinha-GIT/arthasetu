'use client';

import Input, { Select } from '@/components/ui/Input';
import { useLanguage } from '@/contexts/LanguageContext';
import { ALL_INDIAN_REGIONS } from '@/lib/firestore/users';
import { getDistrictOptions, getDistrictsByState } from '@/lib/constants/districts';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import type { UserProfile } from '@/types';

interface StepBasicInfoProps {
  data: Partial<UserProfile>;
  onChange: (fields: Partial<UserProfile>) => void;
  errors?: Record<string, string>;
  legacyDistrict?: string;
  onClearLegacyDistrict?: () => void;
}

export default function StepBasicInfo({
  data,
  onChange,
  errors = {},
  legacyDistrict,
  onClearLegacyDistrict,
}: StepBasicInfoProps) {
  const { t, setLanguage, language } = useLanguage();

  const stateOptions = [
    { value: '', label: t.onboarding.selectState },
    ...ALL_INDIAN_REGIONS.map((s) => ({ value: s, label: s })),
  ];

  const districtOptions = data.state
    ? [{ value: '', label: 'Select district' }, ...getDistrictOptions(data.state)]
    : [{ value: '', label: 'Select a state first' }];

  const languageOptions = SUPPORTED_LANGUAGES.map((l) => ({
    value: l.code,
    label: `${l.nativeName} (${l.name})${l.isMachineTranslated ? ' — AI' : ''}`,
  }));

  const handleStateChange = (newState: string) => {
    const validDistricts = getDistrictsByState(newState);
    const shouldClearDistrict = data.district && !validDistricts.includes(data.district);
    if (onClearLegacyDistrict) onClearLegacyDistrict();
    onChange({
      state: newState,
      district: shouldClearDistrict ? '' : data.district,
    });
  };

  const handleDistrictChange = (newDistrict: string) => {
    if (onClearLegacyDistrict) onClearLegacyDistrict();
    onChange({ district: newDistrict });
  };

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
          onChange={(e) => handleStateChange(e.target.value)}
          options={stateOptions}
          error={errors.state}
          required
        />
        <Select
          label={t.onboarding.district}
          value={data.district || ''}
          onChange={(e) => handleDistrictChange(e.target.value)}
          options={districtOptions}
          disabled={!data.state}
          required
          error={errors.district}
          hint={
            legacyDistrict
              ? `Your previously saved district ('${legacyDistrict}') didn't match our list — please reselect it.`
              : undefined
          }
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
