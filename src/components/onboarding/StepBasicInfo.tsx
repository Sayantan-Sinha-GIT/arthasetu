'use client';

import { useState, useEffect } from 'react';
import Input, { Select } from '@/components/ui/Input';
import { useLanguage } from '@/contexts/LanguageContext';
import { ALL_INDIAN_REGIONS } from '@/lib/firestore/users';
import { getDistrictOptions, getDistrictsByState } from '@/lib/constants/districts';
import { lookupPincode, fetchPincodeInfo, type PincodeInfo } from '@/lib/constants/pincodes';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import type { UserProfile } from '@/types';

interface StepBasicInfoProps {
  data: Partial<UserProfile>;
  onChange: (fields: Partial<UserProfile>) => void;
  errors?: Record<string, string>;
}

export default function StepBasicInfo({
  data,
  onChange,
  errors = {},
}: StepBasicInfoProps) {
  const { t, setLanguage, language } = useLanguage();
  const [resolvedInfo, setResolvedInfo] = useState<PincodeInfo | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Sync initial PIN code resolution on mount or data load
  useEffect(() => {
    if (data.pinCode && /^[1-9][0-9]{5}$/.test(data.pinCode)) {
      const direct = lookupPincode(data.pinCode);
      if (direct) {
        setResolvedInfo(direct);
      }
      fetchPincodeInfo(data.pinCode).then((info) => {
        if (info) setResolvedInfo(info);
      });
    }
  }, [data.pinCode]);

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

  const handlePinChange = async (pin: string) => {
    const clean = pin.replace(/[^0-9]/g, '').slice(0, 6);

    if (clean.length === 6 && /^[1-9][0-9]{5}$/.test(clean)) {
      setIsResolving(true);
      const info = await fetchPincodeInfo(clean);
      setIsResolving(false);

      if (info) {
        setResolvedInfo(info);
        const autoLocality = info.areas.length > 0 ? info.areas[0] : (data.locality || '');
        onChange({
          pinCode: clean,
          state: info.state,
          district: info.district,
          locality: autoLocality,
        });
        return;
      }
    } else {
      setResolvedInfo(null);
    }

    onChange({ pinCode: clean });
  };

  const handleStateChange = (newState: string) => {
    const validDistricts = getDistrictsByState(newState);
    const shouldClearDistrict = data.district && !validDistricts.includes(data.district);
    onChange({
      state: newState,
      district: shouldClearDistrict ? '' : data.district,
    });
  };

  const handleDistrictChange = (newDistrict: string) => {
    onChange({ district: newDistrict });
  };

  const handleLanguageChange = (code: string) => {
    onChange({ language: code });
    setLanguage(code);
  };

  const areaOptions = resolvedInfo?.areas && resolvedInfo.areas.length > 0
    ? [
        { value: '', label: t.onboarding.locality + ' / Post Office' },
        ...resolvedInfo.areas.map((a) => ({ value: a, label: a }))
      ]
    : [{ value: '', label: 'Select a valid PIN code first' }];

  const pinError =
    errors.pinCode ||
    (data.pinCode && data.pinCode.length > 0 && !/^[1-9][0-9]{5}$/.test(data.pinCode)
      ? 'PIN code must be 6 digits and cannot start with 0'
      : undefined);

  const isAddressLocked = !!resolvedInfo && !!data.pinCode && /^[1-9][0-9]{5}$/.test(data.pinCode);

  return (
    <div className="space-y-5 animate-fade-in">
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

      {/* PIN-First Address Box */}
      <div className="bg-surface-elevated/40 border border-border/70 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📍</span>
            <span className="text-sm font-bold text-foreground">Address & Location Details</span>
          </div>
          {isResolving && (
            <span className="text-xs text-primary animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" /> Resolving PIN...
            </span>
          )}
        </div>

        {/* PIN Code Input */}
        <div>
          <Input
            label={t.onboarding.pinCode}
            type="text"
            value={data.pinCode || ''}
            onChange={(e) => handlePinChange(e.target.value)}
            placeholder={t.onboarding.pinCodePlaceholder}
            error={pinError}
            maxLength={6}
            required
            hint={
              isAddressLocked
                ? `🔒 Auto-resolved & Locked: ${resolvedInfo.district}, ${resolvedInfo.state}`
                : 'Enter your 6-digit postal PIN code to automatically resolve and lock your State & District.'
            }
          />
        </div>

        {/* State & District (Auto-locked when PIN matches) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t.onboarding.state}
            value={data.state || ''}
            onChange={(e) => handleStateChange(e.target.value)}
            options={stateOptions}
            error={errors.state}
            disabled={true}
            required
            hint="🔒 Auto-populated based on PIN Code"
          />
          <Select
            label={t.onboarding.district}
            value={data.district || ''}
            onChange={(e) => handleDistrictChange(e.target.value)}
            options={districtOptions}
            disabled={true}
            required
            error={errors.district}
            hint="🔒 Auto-populated based on PIN Code"
          />
        </div>

        {/* Post Office / Area (Dropdown) */}
        <Select
          label={t.onboarding.locality + ' / Post Office'}
          value={data.locality || ''}
          onChange={(e) => onChange({ locality: e.target.value })}
          options={areaOptions}
          disabled={!isAddressLocked || !resolvedInfo?.areas?.length}
          required
          error={errors.locality}
          hint={isAddressLocked ? "Select your specific Post Office branch" : "Requires valid PIN Code"}
        />

        {/* Road Name / House No (Optional Text) */}
        <Input
          label={t.onboarding.roadName}
          type="text"
          value={data.roadName || ''}
          onChange={(e) => onChange({ roadName: e.target.value })}
          placeholder={t.onboarding.roadNamePlaceholder}
          error={errors.roadName}
          hint={t.onboarding.roadNameHint}
        />
      </div>
    </div>
  );
}
