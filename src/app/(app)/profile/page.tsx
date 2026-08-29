'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Input, { Select } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
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
import type { UserProfile } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    language: language || 'en',
    theme: 'light',
    state: '',
    district: '',
    locality: '',
    pinCode: '',
    businessStatus: 'planning',
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
    annualTurnover: 0,
  });

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
          setFormData((prev) => ({
            ...prev,
            ...profile,
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

  const handleNumericChange = (key: keyof UserProfile, valStr: string) => {
    const clean = valStr.replace(/[^0-9]/g, '');
    const num = clean === '' ? 0 : parseInt(clean, 10);
    setFormData((prev) => ({ ...prev, [key]: num }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
      // 1. Re-authenticate user with entered password
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);

      // 2. Delete all Firestore user documents (users, plans, advice) FIRST
      await deleteUserFirestoreData(user.uid);

      // 3. Delete Firebase Auth account
      await deleteUser(user);

      // 4. Redirect to login page with deleted banner
      router.push('/login?deleted=true');
    } catch (err: any) {
      console.error('Account deletion error:', err);
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password. Please enter your valid password to confirm deletion.');
      } else if (code === 'auth/requires-recent-login') {
        setDeleteError('Security timeout: Please log out and log in again before deleting your account.');
      } else {
        setDeleteError(err?.message || 'Failed to delete account. Please try again.');
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
        <Footer />
      </>
    );
  }

  const stateOptions = [
    { value: '', label: t.onboarding.selectState },
    ...ALL_INDIAN_REGIONS.map((s) => ({ value: s, label: s })),
  ];

  const categoryOptions = [
    { value: '', label: t.onboarding.selectCategory },
    ...BUSINESS_CATEGORIES.map((c) => ({ value: c, label: c })),
  ];

  const experienceOptions = [
    { value: '', label: t.onboarding.selectExperience },
    ...EXPERIENCE_LEVELS.map((exp) => ({ value: exp, label: exp })),
  ];

  const genderOptions = [
    { value: '', label: t.onboarding.selectGender },
    ...GENDERS.map((g) => ({ value: g, label: g })),
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {t.profile.title}
            </h1>
            <p className="text-muted text-sm sm:text-base mt-1">
              {t.profile.subtitle}
            </p>
          </div>

          <div className="shrink-0">
            <Button
              type="submit"
              form="profile-form"
              isLoading={saving}
              size="md"
              className="px-6"
            >
              {t.profile.saveChanges}
            </Button>
          </div>
        </div>

        {/* Success Alert */}
        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-success-light border border-success text-green-900 dark:text-green-200 text-sm font-semibold flex items-center gap-2 animate-slide-up">
            <svg className="w-5 h-5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{t.profile.savedSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-danger-light border border-danger text-danger text-sm font-semibold flex items-center gap-2">
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Edit Form (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <form id="profile-form" onSubmit={handleSave} className="space-y-6">
              {/* Section 1: Personal & Location */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>👤</span>
                    <span>{t.profile.basicSection}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label={t.auth.name}
                      value={formData.name || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                    <Input
                      label={t.auth.email}
                      value={user?.email || ''}
                      disabled
                      hint="Account email linked with Firebase Auth"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label={t.onboarding.state}
                      value={formData.state || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                      options={stateOptions}
                      required
                    />
                    <Input
                      label={t.onboarding.district}
                      value={formData.district || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                      placeholder={t.onboarding.districtPlaceholder}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label={t.onboarding.locality}
                      value={formData.locality || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, locality: e.target.value }))}
                      placeholder={t.onboarding.localityPlaceholder}
                      required
                    />
                    <Input
                      label={t.onboarding.pinCode}
                      value={formData.pinCode || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, pinCode: e.target.value }))}
                      placeholder={t.onboarding.pinCodePlaceholder}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Section 2: Business Details */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>🏪</span>
                    <span>{t.profile.businessSection}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Business Status Toggle */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">
                      {t.onboarding.businessStatus}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, businessStatus: 'planning' }))}
                        className={`
                          py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all
                          ${formData.businessStatus === 'planning'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-surface-elevated text-muted'
                          }
                        `}
                      >
                        🌱 {t.onboarding.planningBusiness}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, businessStatus: 'existing' }))}
                        className={`
                          py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all
                          ${formData.businessStatus === 'existing'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-surface-elevated text-muted'
                          }
                        `}
                      >
                        🏪 {t.onboarding.existingBusiness}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label={t.onboarding.businessCategory}
                      value={formData.businessCategory || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, businessCategory: e.target.value }))}
                      options={categoryOptions}
                      required
                    />
                    <Select
                      label={t.onboarding.businessExperience}
                      value={formData.businessExperience || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, businessExperience: e.target.value }))}
                      options={experienceOptions}
                    />
                  </div>

                  <Input
                    label={t.onboarding.businessType}
                    value={formData.businessType || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, businessType: e.target.value }))}
                    placeholder={t.onboarding.businessTypePlaceholder}
                    required
                  />
                </CardContent>
              </Card>

              {/* Section 3: Financial Details */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>💰</span>
                    <span>{t.profile.financialSection}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label={t.onboarding.availableCapital}
                      value={formData.availableCapital ? formData.availableCapital.toString() : ''}
                      onChange={(e) => handleNumericChange('availableCapital', e.target.value)}
                      placeholder={t.onboarding.availableCapitalPlaceholder}
                      required
                    />
                    <Input
                      label={t.onboarding.desiredFunding}
                      value={formData.desiredFunding ? formData.desiredFunding.toString() : ''}
                      onChange={(e) => handleNumericChange('desiredFunding', e.target.value)}
                      placeholder={t.onboarding.desiredFundingPlaceholder}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label={t.onboarding.monthlyIncome}
                      value={formData.monthlyIncome ? formData.monthlyIncome.toString() : ''}
                      onChange={(e) => handleNumericChange('monthlyIncome', e.target.value)}
                      placeholder={t.onboarding.monthlyIncomePlaceholder}
                    />
                    <Input
                      label={t.onboarding.monthlyExpenses}
                      value={formData.monthlyExpenses ? formData.monthlyExpenses.toString() : ''}
                      onChange={(e) => handleNumericChange('monthlyExpenses', e.target.value)}
                      placeholder={t.onboarding.monthlyExpensesPlaceholder}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Section 4: Eligibility Details */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>📋</span>
                    <span>{t.profile.eligibilitySection}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DatePicker
                      label={t.onboarding.dob}
                      value={formData.dob || ''}
                      onChange={(dob) => setFormData((prev) => ({ ...prev, dob }))}
                      helperText={t.onboarding.dobPlaceholder}
                    />
                    <Select
                      label={t.onboarding.gender}
                      value={formData.gender || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                      options={genderOptions}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label={t.onboarding.employeeCount}
                      value={formData.employeeCount ? formData.employeeCount.toString() : ''}
                      onChange={(e) => handleNumericChange('employeeCount', e.target.value)}
                      placeholder={t.onboarding.employeeCountPlaceholder}
                    />
                    <Input
                      label={t.onboarding.annualTurnover}
                      value={formData.annualTurnover ? formData.annualTurnover.toString() : ''}
                      onChange={(e) => handleNumericChange('annualTurnover', e.target.value)}
                      placeholder={t.onboarding.annualTurnoverPlaceholder}
                    />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border bg-surface-elevated hover:border-muted">
                    <input
                      type="checkbox"
                      checked={!!formData.existingLoans}
                      onChange={(e) => setFormData((prev) => ({ ...prev, existingLoans: e.target.checked }))}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {t.onboarding.existingLoans}
                    </span>
                  </label>
                </CardContent>
              </Card>

              {/* Bottom Submit CTA */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  isLoading={saving}
                  size="lg"
                  className="px-8"
                >
                  {t.profile.saveChanges}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Sidebar: Completeness & Quick Language (1 Col) */}
          <div className="space-y-6">
            <ProfileCompleteness profile={formData} />

            <Card padding="md" className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">
                🌐 {t.onboarding.preferredLanguage}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, language: 'en' }));
                    setLanguage('en');
                  }}
                  className={`
                    py-2 px-3 rounded-xl border text-xs font-semibold transition-all
                    ${language === 'en'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-surface text-muted'
                    }
                  `}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, language: 'hi' }));
                    setLanguage('hi');
                  }}
                  className={`
                    py-2 px-3 rounded-xl border text-xs font-semibold transition-all
                    ${language === 'hi'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-surface text-muted'
                    }
                  `}
                >
                  हिंदी (Hindi)
                </button>
              </div>
            </Card>

            {/* Danger Zone: Account Deletion */}
            <div className="rounded-2xl border border-danger/30 bg-danger-light/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-danger">
                <span className="text-base">⚠️</span>
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Danger Zone
                </h4>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Permanently erase your entrepreneur account, profile, all saved plans, advisor history, and Gramin Score.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeleteError('');
                  setDeletePassword('');
                  setIsDeleteModalOpen(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-danger hover:bg-danger/90 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>🗑️</span>
                <span>Delete My Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Self-Service Account Deletion Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-surface-elevated border border-danger/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-danger/10 text-danger flex items-center justify-center text-xl shrink-0">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Permanently Delete Account?
                  </h3>
                  <p className="text-xs text-muted">
                    This action is immediate, permanent, and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-danger-light/30 border border-danger/20 text-xs text-danger-dark dark:text-danger space-y-1.5">
                <p className="font-bold">The following will be permanently erased:</p>
                <ul className="list-disc pl-4 space-y-0.5 opacity-90">
                  <li>Your user profile, location, and enterprise details</li>
                  <li>All saved financial plans and break-even projections</li>
                  <li>All saved AI advisor advice and recommendations</li>
                  <li>All self-reported Gramin Credit Score records</li>
                </ul>
              </div>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Re-enter your Password to confirm:
                  </label>
                  <Input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter current password"
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
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    size="sm"
                    isLoading={deleteLoading}
                    className="shadow-md"
                  >
                    Delete Everything & Close Account
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
