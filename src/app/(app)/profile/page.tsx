'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Input, { Select, NumberInput } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AmbientBackground from '@/components/ui/AmbientBackground';
import ProfileCompleteness from '@/components/dashboard/ProfileCompleteness';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import {
  getUserProfile,
  updateUserProfile,
  deleteUserFirestoreData,
  ALL_INDIAN_REGIONS,
  BUSINESS_CATEGORIES,
  EXPERIENCE_LEVELS,
  GENDERS,
} from '@/lib/firestore/users';
import { getDistrictOptions, getDistrictsByState } from '@/lib/constants/districts';
import { GENDER_KEYS } from '@/lib/constants/profile-options';
import {
  lookupPincode,
  fetchPincodeInfo,
  validateAddressConsistency,
  isValidPincode,
  PINCODE_MASTER_RECORDS,
  type PincodeInfo,
} from '@/lib/constants/pincodes';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';
import { getErrorCode, getErrorMessage } from '@/lib/utils/errors';
import type { UserProfile, LoanDetail } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { quality, setPreference } = useNetworkQuality();
  const isDataSaverOn = quality !== 'full';

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    state: '',
    district: '',
    locality: '',
    pinCode: '',
    businessStatus: '',
    businessCategory: '',
    businessType: '',
    businessExperience: '',
    availableCapital: 0,
    desiredFunding: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    dob: '',
    gender: '',
    employeeCount: 0,
    existingLoans: false,
    loanDetails: [],
    annualTurnover: 0,
    language: 'en',
    theme: 'light',
  });

  const [resolvedInfo, setResolvedInfo] = useState<PincodeInfo | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [dismissedDistrictHint, setDismissedDistrictHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Self-Service Deletion States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadProfile() {
      if (!user) return;
      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          let loadedDistrict = profile.district || '';
          if (profile.state && loadedDistrict) {
            const validDistricts = getDistrictsByState(profile.state);
            if (!validDistricts.includes(loadedDistrict)) {
              // Stored district no longer matches the canonical list for this
              // state (e.g. renamed/reclassified district) — clear it so the
              // dropdown doesn't show a stale, unselectable value.
              loadedDistrict = '';
            }
          }

          if (profile.pinCode && /^[1-9][0-9]{5}$/.test(profile.pinCode)) {
            const direct = lookupPincode(profile.pinCode);
            if (direct) setResolvedInfo(direct);
            fetchPincodeInfo(profile.pinCode).then((info) => {
              if (info) setResolvedInfo(info);
            });
          }

          setFormData((prev) => ({
            ...prev,
            ...profile,
            district: loadedDistrict,
            loanDetails: profile.loanDetails || [],
          }));
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadProfile();
    }
  }, [user, authLoading, router]);

  const handlePinChange = async (pin: string) => {
    const clean = pin.replace(/[^0-9]/g, '').slice(0, 6);

    if (clean.length === 6 && /^[1-9][0-9]{5}$/.test(clean)) {
      setIsResolving(true);
      const info = await fetchPincodeInfo(clean);
      setIsResolving(false);

      if (info) {
        setResolvedInfo(info);
        const autoLocality = info.areas.length > 0 ? info.areas[0] : (formData.locality || '');
        setFormData((prev) => ({
          ...prev,
          pinCode: clean,
          state: info.state,
          district: info.district,
          locality: autoLocality,
        }));
        return;
      }
    } else {
      setResolvedInfo(null);
    }

    setFormData((prev) => ({ ...prev, pinCode: clean }));
  };

  const handleLanguageChange = (code: string) => {
    setFormData((prev) => ({ ...prev, language: code }));
    setLanguage(code);
  };

  const handleToggleLoans = (checked: boolean) => {
    const currentLoans = formData.loanDetails || [];
    if (checked) {
      const initialLoans: LoanDetail[] = currentLoans.length > 0 ? currentLoans : [
        {
          id: `loan_${Date.now()}`,
          lenderType: 'bank',
          outstandingAmount: 0,
          monthlyEmi: 0,
        },
      ];
      setFormData((prev) => ({ ...prev, existingLoans: true, loanDetails: initialLoans }));
    } else {
      setFormData((prev) => ({ ...prev, existingLoans: false, loanDetails: [] }));
    }
  };

  const handleAddLoan = () => {
    const currentLoans = formData.loanDetails || [];
    const newLoan: LoanDetail = {
      id: `loan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lenderType: 'bank',
      outstandingAmount: 0,
      monthlyEmi: 0,
    };
    setFormData((prev) => ({ ...prev, loanDetails: [...currentLoans, newLoan] }));
  };

  const handleUpdateLoan = (id: string, updates: Partial<LoanDetail>) => {
    const currentLoans = formData.loanDetails || [];
    const updated = currentLoans.map((l) => (l.id === id ? { ...l, ...updates } : l));
    setFormData((prev) => ({ ...prev, loanDetails: updated }));
  };

  const handleRemoveLoan = (id: string) => {
    const currentLoans = formData.loanDetails || [];
    const remaining = currentLoans.filter((l) => l.id !== id);
    setFormData((prev) => ({
      ...prev,
      loanDetails: remaining,
      existingLoans: remaining.length > 0,
    }));
  };

  const pinError =
    formData.pinCode && formData.pinCode.length > 0 && !/^[1-9][0-9]{5}$/.test(formData.pinCode)
      ? 'PIN code must be exactly 6 digits and cannot start with 0'
      : undefined;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.pinCode || !/^[1-9][0-9]{5}$/.test(formData.pinCode)) {
      setErrorMessage('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    if (!isValidPincode(formData.pinCode)) {
      setErrorMessage('Invalid or unresolvable Indian postal PIN code.');
      return;
    }

    if (formData.state && formData.district) {
      const consistency = validateAddressConsistency(formData.pinCode, formData.state, formData.district);
      if (!consistency.valid) {
        setErrorMessage(consistency.reason || 'PIN code does not match state/district.');
        return;
      }
    }

    if (pinError) {
      setErrorMessage(pinError);
      return;
    }
    setSaving(true);
    setSavedSuccess(false);
    setErrorMessage('');

    try {
      await updateUserProfile(user.uid, formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setErrorMessage(t.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      await deleteUserFirestoreData(user.uid);
      await deleteUser(user);
      router.push('/login?deleted=true');
    } catch (err) {
      console.error('Account deletion error:', err);
      const code = getErrorCode(err);
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password. Please enter your valid password to confirm deletion.');
      } else if (code === 'auth/requires-recent-login') {
        setDeleteError('Security timeout: Please log out and log in again before deleting your account.');
      } else {
        setDeleteError(getErrorMessage(err, 'Failed to delete account. Please try again.'));
      }
      setDeleteLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-[80vh] flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted mt-3 animate-pulse">{t.common.loading}</p>
        </main>
      </>
    );
  }

  const stateOptions = [{ value: '', label: t.onboarding.selectState }, ...ALL_INDIAN_REGIONS.map((s) => ({ value: s, label: s }))];
  const districtOptions = formData.state
    ? [{ value: '', label: 'Select district' }, ...getDistrictOptions(formData.state)]
    : [{ value: '', label: 'Select a state first' }];
  const categoryOptions = [{ value: '', label: t.onboarding.selectCategory }, ...BUSINESS_CATEGORIES.map((c) => ({ value: c, label: c }))];
  const experienceOptions = [{ value: '', label: t.onboarding.selectExperience }, ...EXPERIENCE_LEVELS.map((exp) => ({ value: exp, label: exp }))];
  // Stored in English, shown in the user's language.
  const genderOptions = [
    { value: '', label: t.onboarding.selectGender },
    ...GENDERS.map((g) => ({ value: g, label: (t.onboarding.genderOptions as Record<string, string> | undefined)?.[GENDER_KEYS[g]] || g })),
  ];
  const languageOptions = SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: `${l.nativeName} (${l.name})${l.isMachineTranslated ? ' — AI' : ''}` }));
  const lenderOptions = [
    { value: 'bank', label: t.graminScore?.bank || 'Commercial Bank' },
    { value: 'nbfc', label: t.graminScore?.nbfc || 'NBFC / MFI' },
    { value: 'shg_cooperative', label: t.graminScore?.shg || 'SHG / Cooperative Credit Society' },
    { value: 'informal', label: t.graminScore?.moneylender || 'Informal / Private Lender' },
  ];
  const loansList = formData.loanDetails || [];

  const isAddressLocked = !!resolvedInfo && !!formData.pinCode && /^[1-9][0-9]{5}$/.test(formData.pinCode);

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        <AmbientBackground variant="subtle" />
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 bg-[#0B0806] border border-[#3A291D] shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent mix-blend-screen pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-white flex items-center gap-4 tracking-tighter uppercase leading-[0.9]">
              <span className="text-5xl sm:text-6xl text-primary drop-shadow-[0_0_15px_rgba(255,119,0,0.4)]">⚙️</span>
              <span>{t.profile.title}</span>
            </h1>
            <p className="text-sm sm:text-base text-white/70 font-serif max-w-xl">
              {t.profile.subtitle}
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-3 shrink-0 self-start sm:self-center">
            <Button type="submit" form="profile-form" isLoading={saving} size="lg" className="px-8 shadow-xl font-bold uppercase tracking-widest text-xs">
              {t.profile.saveChanges}
            </Button>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-success-light border border-success text-green-900 dark:text-green-200 text-sm font-semibold flex items-center gap-2 animate-slide-up">
            <span>{t.profile.savedSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-danger-light border border-danger text-danger text-sm font-semibold flex items-center gap-2">
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <form id="profile-form" onSubmit={handleSave} className="space-y-6">
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>👤</span>
                    <span>{t.profile.basicSection}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label={t.auth.name} value={formData.name || ''} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} required />
                    <Input label={t.auth.email} value={user?.email || ''} disabled hint="Account email linked with Firebase Auth" />
                  </div>

                  {/* PIN-First Address Sub-Card */}
                  <div className="bg-surface-elevated/40 border border-border/70 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                        <span>📍</span> Address & Postal Location
                      </span>
                      {isResolving && (
                        <span className="text-xs text-primary animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /> Resolving...
                        </span>
                      )}
                    </div>

                    <div>
                      <Input
                        label={`📮 ${t.onboarding.pinCode}`}
                        value={formData.pinCode || ''}
                        onChange={(e) => handlePinChange(e.target.value)}
                        placeholder={t.onboarding.pinCodePlaceholder}
                        error={pinError}
                        maxLength={6}
                        required
                        hint={
                          isAddressLocked
                            ? `✅ Auto-resolved: ${resolvedInfo.district}, ${resolvedInfo.state}`
                            : 'Enter 6-digit PIN code to lock and auto-fill your State & District.'
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label={`${t.onboarding.state}`}
                        value={formData.state || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        options={stateOptions}
                        required
                        hint={resolvedInfo ? "📍 Auto-suggested from PIN Code" : undefined}
                      />
                      <Select
                        label={`${t.onboarding.district}`}
                        value={formData.district || ''}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, district: e.target.value }));
                          setDismissedDistrictHint(false);
                        }}
                        options={districtOptions}
                        disabled={!formData.state}
                        required
                        hint={resolvedInfo ? "📍 Select your verified district" : undefined}
                      />
                    </div>

                    {/* Soft non-blocking hint if district differs from prefix default */}
                    {resolvedInfo && formData.district && !PINCODE_MASTER_RECORDS[formData.pinCode || ''] &&
                     formData.district.trim().toLowerCase() !== resolvedInfo.district.trim().toLowerCase() &&
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

                    <div>
                      <Select
                        label={t.onboarding.locality + ' / Post Office'}
                        value={formData.locality || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, locality: e.target.value }))}
                        options={
                          resolvedInfo?.areas && resolvedInfo.areas.length > 0
                            ? [
                                { value: '', label: t.onboarding.locality + ' / Post Office' },
                                ...resolvedInfo.areas.map(a => ({ value: a, label: a }))
                              ]
                            : [{ value: '', label: 'Select a valid PIN code first' }]
                        }
                        disabled={!isAddressLocked || !resolvedInfo?.areas?.length}
                        required
                        hint={isAddressLocked ? "Select your specific Post Office branch" : "Requires valid PIN Code"}
                      />
                    </div>

                    {/* Road Name / House No */}
                    <div>
                      <Input
                        label={t.onboarding.roadName}
                        type="text"
                        value={formData.roadName || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, roadName: e.target.value }))}
                        placeholder={t.onboarding.roadNamePlaceholder}
                        hint={t.onboarding.roadNameHint}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>🏪</span>
                    <span>{t.profile.businessSection}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">{t.onboarding.businessStatus}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setFormData((prev) => ({ ...prev, businessStatus: 'planning' }))} className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${formData.businessStatus === 'planning' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface-elevated text-muted'}`}>🌱 {t.onboarding.planningBusiness}</button>
                      <button type="button" onClick={() => setFormData((prev) => ({ ...prev, businessStatus: 'existing' }))} className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${formData.businessStatus === 'existing' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface-elevated text-muted'}`}>🏪 {t.onboarding.existingBusiness}</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select label={t.onboarding.businessCategory} value={formData.businessCategory || ''} onChange={(e) => setFormData((prev) => ({ ...prev, businessCategory: e.target.value }))} options={categoryOptions} required />
                    <Select label={t.onboarding.businessExperience} value={formData.businessExperience || ''} onChange={(e) => setFormData((prev) => ({ ...prev, businessExperience: e.target.value }))} options={experienceOptions} />
                  </div>
                  <Input label={t.onboarding.businessType} value={formData.businessType || ''} onChange={(e) => setFormData((prev) => ({ ...prev, businessType: e.target.value }))} placeholder={t.onboarding.businessTypePlaceholder} required />
                </CardContent>
              </Card>

              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>💰</span>
                    <span>{t.profile.financialSection}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NumberInput label={t.onboarding.availableCapital} value={formData.availableCapital !== undefined ? formData.availableCapital : ''} onValueChange={(val) => setFormData((prev) => ({ ...prev, availableCapital: val }))} placeholder={t.onboarding.availableCapitalPlaceholder} min={0} required />
                    <NumberInput label={t.onboarding.desiredFunding} value={formData.desiredFunding !== undefined ? formData.desiredFunding : ''} onValueChange={(val) => setFormData((prev) => ({ ...prev, desiredFunding: val }))} placeholder={t.onboarding.desiredFundingPlaceholder} min={0} required />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NumberInput label={t.onboarding.monthlyIncome} value={formData.monthlyIncome !== undefined ? formData.monthlyIncome : ''} onValueChange={(val) => setFormData((prev) => ({ ...prev, monthlyIncome: val }))} placeholder={t.onboarding.monthlyIncomePlaceholder} min={0} />
                    <NumberInput label={t.onboarding.monthlyExpenses} value={formData.monthlyExpenses !== undefined ? formData.monthlyExpenses : ''} onValueChange={(val) => setFormData((prev) => ({ ...prev, monthlyExpenses: val }))} placeholder={t.onboarding.monthlyExpensesPlaceholder} min={0} />
                  </div>
                </CardContent>
              </Card>

              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>📋</span>
                    <span>{t.profile.eligibilitySection}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DatePicker label={t.onboarding.dob} value={formData.dob || ''} onChange={(dob) => setFormData((prev) => ({ ...prev, dob }))} helperText={t.onboarding.dobPlaceholder} />
                    <Select label={t.onboarding.gender} value={formData.gender || ''} onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))} options={genderOptions} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NumberInput label={t.onboarding.employeeCount} value={formData.employeeCount !== undefined ? formData.employeeCount : ''} onValueChange={(val) => setFormData((prev) => ({ ...prev, employeeCount: val }))} placeholder={t.onboarding.employeeCountPlaceholder} min={0} />
                    <NumberInput label={t.onboarding.annualTurnover} value={formData.annualTurnover !== undefined ? formData.annualTurnover : ''} onValueChange={(val) => setFormData((prev) => ({ ...prev, annualTurnover: val }))} placeholder={t.onboarding.annualTurnoverPlaceholder} min={0} />
                  </div>
                  <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-xl border border-border bg-surface-elevated hover:border-muted transition-all">
                      <input type="checkbox" checked={!!formData.existingLoans} onChange={(e) => handleToggleLoans(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer" />
                      <span className="text-sm font-semibold text-foreground">{t.onboarding.existingLoans}</span>
                    </label>
                    {formData.existingLoans && (
                      <div className="p-4 rounded-2xl bg-surface border border-border space-y-4 animate-scale-in">
                        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                          <span className="text-xs font-bold text-foreground">Active Loan Records ({loansList.length})</span>
                          <button type="button" onClick={handleAddLoan} className="text-xs font-bold text-primary hover:underline flex items-center gap-1"><span>➕</span><span>Add Another Loan</span></button>
                        </div>
                        {loansList.map((loan, idx) => (
                          <div key={loan.id} className="p-3.5 rounded-xl bg-surface-elevated border border-border space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-muted">
                              <span>Loan #{idx + 1}</span>
                              {loansList.length > 1 && (
                                <button type="button" onClick={() => handleRemoveLoan(loan.id)} className="text-danger hover:underline text-xs font-semibold">✕ Remove</button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <Select label="Lender Type" value={loan.lenderType} onChange={(e) => handleUpdateLoan(loan.id, { lenderType: e.target.value as LoanDetail['lenderType'] })} options={lenderOptions} />
                              <NumberInput label="Outstanding Balance (₹)" value={loan.outstandingAmount !== undefined ? loan.outstandingAmount : ''} onValueChange={(val) => handleUpdateLoan(loan.id, { outstandingAmount: val })} placeholder="e.g. 50000" min={0} />
                              <NumberInput label="Monthly EMI (₹)" value={loan.monthlyEmi !== undefined ? loan.monthlyEmi : ''} onValueChange={(val) => handleUpdateLoan(loan.id, { monthlyEmi: val })} placeholder="e.g. 2500" min={0} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-4">
                <Button type="submit" isLoading={saving} size="lg" className="px-8 shadow-md font-bold">
                  {t.profile.saveChanges}
                </Button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <ProfileCompleteness profile={formData} />
            <Card padding="md" className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>🌐</span>
                <span>{t.onboarding.preferredLanguage}</span>
              </h3>
              <Select value={formData.language || language || 'en'} onChange={(e) => handleLanguageChange(e.target.value)} options={languageOptions} />
            </Card>

            {/* Data Saver Mode Card */}
            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>⚡</span>
                  <span>Data Saver</span>
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDataSaverOn}
                    onChange={(e) => setPreference(e.target.checked ? 'on' : 'off')}
                    className="sr-only peer"
                    aria-label="Toggle Data Saver mode"
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
              <p className="text-xs font-medium text-foreground">
                {t.profile.dataSaverDesc}
              </p>
              <p className="text-[11px] text-muted leading-relaxed">
                {t.profile.dataSaverNote}
              </p>
            </Card>
            <div className="rounded-2xl border border-danger/30 bg-danger-light/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-danger">
                <span className="text-base">⚠️</span>
                <h4 className="text-xs font-bold uppercase tracking-wider">{t.profile.dangerZone}</h4>
              </div>
              <p className="text-xs text-muted leading-relaxed">{t.profile.dangerZoneDesc}</p>
              <button type="button" onClick={() => { setDeleteError(''); setDeletePassword(''); setIsDeleteModalOpen(true); }} className="w-full py-2 px-3 rounded-xl bg-danger hover:bg-danger/90 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer">
                <span>🗑️</span>
                <span>{t.profile.deleteMyAccount}</span>
              </button>
            </div>
          </div>
        </div>

        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-surface-elevated border border-danger/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-danger/10 text-danger flex items-center justify-center text-xl shrink-0">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {t.profile.deleteModalTitle}
                  </h3>
                  <p className="text-xs text-muted">
                    {t.profile.deleteModalSubtitle}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-danger-light/30 border border-danger/20 text-xs text-danger-dark dark:text-danger space-y-1.5">
                <p className="font-bold">{t.profile.deleteEraseListTitle}</p>
                <ul className="list-disc pl-4 space-y-0.5 opacity-90">
                  <li>{t.profile.deleteEraseProfile}</li>
                  <li>{t.profile.deleteErasePlans}</li>
                  <li>{t.profile.deleteEraseAdvice}</li>
                  <li>{t.profile.deleteEraseScore}</li>
                </ul>
              </div>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    {t.profile.deleteConfirmPasswordLabel}
                  </label>
                  <Input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder={t.profile.deleteConfirmPasswordPlaceholder}
                    required
                    autoFocus
                  />
                </div>

                {deleteError && (
                  <p className="text-xs text-danger font-medium bg-danger-light/40 p-2.5 rounded-xl border border-danger/30">
                    {deleteError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deleteLoading}
                    onClick={() => setIsDeleteModalOpen(false)}
                  >
                    {t.profile.deleteCancel}
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    size="sm"
                    isLoading={deleteLoading}
                    className="shadow-md"
                  >
                    {t.profile.deleteConfirmCta}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
