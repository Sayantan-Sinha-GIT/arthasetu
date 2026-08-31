'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AmbientBackground from '@/components/ui/AmbientBackground';
import StepBasicInfo from '@/components/onboarding/StepBasicInfo';
import { getUserProfile, createUserProfile } from '@/lib/firestore/users';
import { getDistrictsByState } from '@/lib/constants/districts';
import { validateAddressConsistency, isValidPincode } from '@/lib/constants/pincodes';
import type { UserProfile } from '@/types';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [legacyDistrict, setLegacyDistrict] = useState<string>('');

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    language: language || 'en',
    theme: 'light',
    state: '',
    district: '',
    locality: '',
    pinCode: '',
    onboardingComplete: false,
  });

  // Load existing profile if user is logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
    const adminRouteKey = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

    if (user && user.email?.trim().toLowerCase() === adminEmail) {
      router.push(`/${adminRouteKey}/admin`);
      return;
    }

    async function loadProfile() {
      if (!user) return;
      try {
        const existing = await getUserProfile(user.uid);
        if (existing) {
          let loadedDistrict = existing.district || '';
          let legacyVal = '';
          if (existing.state && loadedDistrict) {
            const validDistricts = getDistrictsByState(existing.state);
            if (validDistricts.includes(loadedDistrict)) {
              // Valid canonical district
            } else {
              legacyVal = loadedDistrict;
              loadedDistrict = '';
            }
          }
          setLegacyDistrict(legacyVal);
          setFormData((prev) => ({
            ...prev,
            ...existing,
            district: loadedDistrict,
            name: existing.name || user.displayName || '',
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            name: user.displayName || '',
            email: user.email || '',
          }));
        }
      } catch (err) {
        console.error('Error loading initial profile:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadProfile();
    }
  }, [user, authLoading, router]);

  const updateFormData = (fields: Partial<UserProfile>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
    // Clear field-specific error on change
    const updatedKeys = Object.keys(fields);
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of updatedKeys) {
        delete next[k];
      }
      return next;
    });
  };

  const validateStep = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.name?.trim()) errs.name = 'Please enter your full name';
    if (!formData.state) errs.state = 'Please select your state';
    if (!formData.district?.trim()) errs.district = 'Please enter your district';
    if (!formData.locality?.trim()) errs.locality = 'Please enter your village / town';
    if (!formData.pinCode?.trim()) {
      errs.pinCode = 'Please enter your 6-digit postal PIN code';
    } else if (!/^[1-9][0-9]{5}$/.test(formData.pinCode.trim())) {
      errs.pinCode = 'PIN code must be 6 digits and cannot start with 0';
    } else if (!isValidPincode(formData.pinCode.trim())) {
      errs.pinCode = 'Invalid or unresolvable PIN code';
    } else if (formData.state && formData.district) {
      const consistency = validateAddressConsistency(formData.pinCode.trim(), formData.state, formData.district);
      if (!consistency.valid) {
        errs.pinCode = consistency.reason || 'PIN code does not match state/district';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleComplete = async () => {
    if (!validateStep()) return;
    if (!user) return;
    
    setSaving(true);
    setErrors({});
    try {
      await createUserProfile({
        ...formData,
        uid: user.uid,
        email: user.email || '',
        onboardingComplete: true,
      });
      router.push('/dashboard');
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname.includes('/onboarding')) {
          window.location.href = '/dashboard';
        }
      }, 400);
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      setErrors({ global: `Failed to save profile: ${err?.message || 'Please try again.'}` });
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-[80vh] flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted mt-3 animate-pulse">Loading your profile setup...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
        <AmbientBackground variant="subtle" />
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center mx-auto mb-3 shadow-md shadow-saffron-500/20">
            <span className="text-white font-bold text-lg">अ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t.onboarding.title}
          </h1>
          <p className="text-muted text-sm sm:text-base mt-2 max-w-lg mx-auto">
            {t.onboarding.subtitle}
          </p>
        </div>

        {/* Wizard Card */}
        <Card glass padding="lg" className="shadow-xl">
          {/* Form Step Body */}
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleComplete();
            }}
          >
            <StepBasicInfo
              data={formData}
              onChange={updateFormData}
              errors={errors}
              legacyDistrict={legacyDistrict}
              onClearLegacyDistrict={() => setLegacyDistrict('')}
            />

            {errors.global && (
              <div className="mt-4 p-3 rounded-xl bg-danger-light text-danger text-sm">
                {errors.global}
              </div>
            )}

            {/* Navigation Controls */}
            <div className="mt-8 pt-6 border-t border-border-subtle flex items-center justify-end gap-3">
              <Button
                type="submit"
                isLoading={saving}
                size="md"
                className="px-6"
              >
                {t.onboarding.finish || 'Complete Setup'} →
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </>
  );
}
