'use client';

import { useState, useEffect } from 'react';
import Input, { Select } from '@/components/ui/Input';
import { useLanguage } from '@/contexts/LanguageContext';
import { ALL_INDIAN_REGIONS } from '@/lib/firestore/users';
import { getDistrictOptions, getDistrictsByState } from '@/lib/constants/districts';
import { lookupPincode, fetchPincodeInfo, PINCODE_MASTER_RECORDS, type PincodeInfo } from '@/lib/constants/pincodes';
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
  const [dismissedDistrictHint, setDismissedDistrictHint] = useState(false);

  // Sync initial PIN code resolution on mount or data load. Needs an effect:
  // `fetchPincodeInfo` is an async network call.
  useEffect(() => {
    if (data.pinCode && /^[1-9][0-9]{5}$/.test(data.pinCode)) {
      const direct = lookupPincode(data.pinCode);
      if (direct) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
              resolvedInfo
                ? `📍 Auto-suggested State: ${resolvedInfo.state} (Suggested District: ${resolvedInfo.district})`
                : 'Enter your 6-digit postal PIN code to automatically suggest State & District.'
            }
          />
        </div>

        {/* State & District (Auto-suggested, freely selectable) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t.onboarding.state}
            value={data.state || ''}
            onChange={(e) => handleStateChange(e.target.value)}
            options={stateOptions}
            error={errors.state}
            required
            hint={resolvedInfo ? "📍 Auto-suggested from PIN Code" : undefined}
          />
          <Select
            label={t.onboarding.district}
            value={data.district || ''}
            onChange={(e) => {
              handleDistrictChange(e.target.value);
              setDismissedDistrictHint(false);
            }}
            options={districtOptions}
            disabled={!data.state}
            required
            error={errors.district}
            hint={resolvedInfo ? "📍 Select your verified district" : undefined}
          />
        </div>

        {/* Soft non-blocking hint if district differs from prefix default */}
        {resolvedInfo && data.district && !PINCODE_MASTER_RECORDS[data.pinCode || ''] &&
         data.district.trim().toLowerCase() !== resolvedInfo.district.trim().toLowerCase() &&
         !dismissedDistrictHint && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start justify-between gap-2 text-xs text-amber-800 dark:text-amber-200 animate-fade-in" role="status">
            <div className="flex items-start gap-2">
              <span className="text-base leading-none">💡</span>
              <span>
                {(t.onboarding.pinDistrictHint || 'This PIN code is commonly associated with {district}. Please double check your district if this does not look right.').replace('{district}', resolvedInfo.district)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDismissedDistrictHint(true)}
              className="text-amber-700 dark:text-amber-300 hover:opacity-70 p-1 text-sm font-bold"
              aria-label="Dismiss district suggestion hint"
            >
              ✕
            </button>
          </div>
        )}

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

        {/* Consent Checkbox — required before the profile is saved */}
        <div className="pt-2">
          <label
            className={`flex items-start gap-3 p-3.5 rounded-2xl bg-surface border transition-colors cursor-pointer select-none ${
              errors.consent ? 'border-danger' : 'border-border/60 hover:border-primary/40'
            }`}
          >
            <input
              type="checkbox"
              checked={Boolean(data.consentGiven)}
              onChange={(e) => onChange({ consentGiven: e.target.checked })}
              aria-invalid={Boolean(errors.consent)}
              aria-describedby={errors.consent ? 'consent-error' : undefined}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
            />
            <span className="text-xs text-foreground/90 font-medium leading-relaxed">
              {t.onboarding.consentLabel}
            </span>
          </label>
          {errors.consent && (
            <p id="consent-error" className="text-xs text-danger mt-1.5" role="alert">
              {errors.consent}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
