'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ProgressBar from '@/components/onboarding/ProgressBar';
import StepBasicInfo from '@/components/onboarding/StepBasicInfo';
import StepBusinessInfo from '@/components/onboarding/StepBusinessInfo';
import StepFinancialInfo from '@/components/onboarding/StepFinancialInfo';
import StepEligibility from '@/components/onboarding/StepEligibility';
import { getUserProfile, createUserProfile } from '@/lib/firestore/users';
import type { UserProfile } from '@/types';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    onboardingComplete: false,
  });

  const stepTitles = [
    t.onboarding.stepBasic,
    t.onboarding.stepBusiness,
    t.onboarding.stepFinancial,
    t.onboarding.stepEligibility,
  ];

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
          setFormData((prev) => ({
            ...prev,
            ...existing,
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

  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 0) {
      if (!formData.name?.trim()) errs.name = 'Please enter your full name';
      if (!formData.state) errs.state = 'Please select your state';
      if (!formData.district?.trim()) errs.district = 'Please enter your district';
      if (!formData.locality?.trim()) errs.locality = 'Please enter your village / town';
    } else if (step === 1) {
      if (!formData.businessStatus) errs.businessStatus = 'Please select business status';
      if (!formData.businessCategory) errs.businessCategory = 'Please select a business category';
      if (!formData.businessType?.trim()) errs.businessType = 'Please describe your business type or product';
    } else if (step === 2) {
      if (formData.availableCapital === undefined || formData.availableCapital < 0) {
        errs.availableCapital = 'Please enter available capital (or 0)';
      }
      if (!formData.desiredFunding || formData.desiredFunding <= 0) {
        errs.desiredFunding = 'Please enter estimated desired funding amount';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < stepTitles.length - 1) {
      // Save progress so far to Firestore
      if (user) {
        try {
          await createUserProfile({
            ...formData,
            uid: user.uid,
            email: user.email || '',
          });
        } catch (err) {
          console.warn('Progress autosave warning:', err);
        }
      }
      setCurrentStep((prev) => prev + 1);
    } else {
      await handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
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

  const handleSkip = async () => {
    if (!user) return;
    setSaving(true);
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
    } catch (err) {
      console.error('Error skipping onboarding:', err);
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
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
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
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
          {/* Progress Bar */}
          <ProgressBar
            currentStep={currentStep}
            totalSteps={stepTitles.length}
            stepTitles={stepTitles}
            onStepClick={(step) => {
              if (validateStep(currentStep) || step < currentStep) {
                setCurrentStep(step);
              }
            }}
          />

          {/* Form Step Body */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNext();
            }}
          >
            {currentStep === 0 && (
              <StepBasicInfo
                data={formData}
                onChange={updateFormData}
                errors={errors}
              />
            )}

            {currentStep === 1 && (
              <StepBusinessInfo
                data={formData}
                onChange={updateFormData}
                errors={errors}
              />
            )}

            {currentStep === 2 && (
              <StepFinancialInfo
                data={formData}
                onChange={updateFormData}
                errors={errors}
              />
            )}

            {currentStep === 3 && (
              <StepEligibility
                data={formData}
                onChange={updateFormData}
                errors={errors}
              />
            )}

            {errors.global && (
              <div className="mt-4 p-3 rounded-xl bg-danger-light text-danger text-sm">
                {errors.global}
              </div>
            )}

            {/* Navigation Controls */}
            <div className="mt-8 pt-6 border-t border-border-subtle flex items-center justify-between gap-3">
              <div>
                {currentStep > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                  >
                    ← {t.onboarding.previous}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={saving}
                    className="text-muted hover:text-foreground"
                  >
                    {t.onboarding.skip}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {currentStep > 0 && currentStep < stepTitles.length - 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={saving}
                    className="text-muted hover:text-foreground hidden sm:inline-flex"
                  >
                    {t.onboarding.skip}
                  </Button>
                )}

                <Button
                  type="submit"
                  isLoading={saving}
                  size="md"
                  className="px-6"
                >
                  {currentStep === stepTitles.length - 1
                    ? t.onboarding.finish
                    : `${t.onboarding.next} →`}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </main>
      <Footer />
    </>
  );
}
