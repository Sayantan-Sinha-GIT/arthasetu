'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateProfileCompleteness } from '@/lib/firestore/users';
import Card from '@/components/ui/Card';
import type { UserProfile } from '@/types';

interface ProfileCompletenessProps {
  profile: Partial<UserProfile> | null;
}

export default function ProfileCompleteness({ profile }: ProfileCompletenessProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { percentage, completedCount, totalCount, missingFields } = calculateProfileCompleteness(profile);

  const isEmailVerified = user ? user.emailVerified : true;
  const isFull = percentage >= 100 && isEmailVerified;
  const isFieldsCompleteUnverified = percentage >= 100 && !isEmailVerified;

  return (
    <Card padding="md" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {t.dashboard.profileComplete}
            </h3>
            <p className="text-xs text-muted">
              {completedCount} / {totalCount} {t.dashboard.detailsCompleted}
            </p>
          </div>
        </div>
        <span
          className={`
            text-sm font-black px-2.5 py-1 rounded-full border
            ${isFull
              ? 'bg-success-light border-success text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300'
              : percentage >= 70
              ? 'bg-saffron-100 border-saffron-300 text-saffron-800 dark:bg-saffron-900/30 dark:border-saffron-700 dark:text-saffron-300'
              : 'bg-warning-light border-warning text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300'
            }
          `}
        >
          {isFieldsCompleteUnverified ? '90%' : `${percentage}%`}
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-surface border border-border h-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-smooth ${
            isFull
              ? 'bg-success'
              : percentage >= 70
              ? 'bg-primary'
              : 'bg-warning'
          }`}
          style={{ width: isFieldsCompleteUnverified ? '90%' : `${percentage}%` }}
        />
      </div>

      {/* Missing items, email verification notice, or all done nudge */}
      {isFieldsCompleteUnverified ? (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
            ⚠️ Profile details entered. Verify your email to unlock fully tailored schemes & 100% verified status.
          </p>
          <Link
            href="/verify-email"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            <span>Verify Email Address</span>
            <span>→</span>
          </Link>
        </div>
      ) : !isFull ? (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted leading-relaxed">
            {t.dashboard.completeProfile}:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingFields.slice(0, 3).map((field, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface text-muted border border-border-subtle"
              >
                + {field}
              </span>
            ))}
            {missingFields.length > 3 && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium text-muted">
                +{missingFields.length - 3} more
              </span>
            )}
          </div>

          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors pt-1"
          >
            <span>{t.dashboard.completeProfile}</span>
            <span>→</span>
          </Link>
        </div>
      ) : (
        <p className="text-xs text-success font-medium flex items-center gap-1.5 pt-1">
          <span>✓</span> {t.dashboard.allSet}
        </p>
      )}
    </Card>
  );
}
