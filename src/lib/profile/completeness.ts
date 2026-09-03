// ─── Profile completeness scoring (pure) ───
//
// Deliberately free of Firebase imports. This is the single definition of
// "which critical details are still missing", and it is consumed both by the
// dashboard widget and by the AI advisor's system prompt — the advisor is what
// actually collects these, since signup asks for almost nothing. Keeping it
// pure means the server-side prompt builder does not drag the Firebase client
// SDK in behind it, and the rules can be unit-tested on their own.

import type { UserProfile } from '@/types';

export interface ProfileCompleteness {
  percentage: number;
  completedCount: number;
  totalCount: number;
  /** Human-readable labels of what is still missing, in checklist order. */
  missingFields: string[];
}

/**
 * Calculate the profile completeness percentage and identify missing fields.
 */
export function calculateProfileCompleteness(
  profile: Partial<UserProfile> | null
): ProfileCompleteness {
  if (!profile) {
    return { percentage: 0, completedCount: 0, totalCount: 10, missingFields: ['All fields'] };
  }

  const checkpoints = [
    { key: 'name', label: 'Full Name', check: () => !!profile.name && profile.name.trim().length > 0 },
    { key: 'state', label: 'State', check: () => !!profile.state && profile.state.trim().length > 0 },
    { key: 'district', label: 'District', check: () => !!profile.district && profile.district.trim().length > 0 },
    { key: 'locality', label: 'Village / Town', check: () => !!profile.locality && profile.locality.trim().length > 0 },
    { key: 'businessStatus', label: 'Business Status', check: () => !!profile.businessStatus && profile.businessStatus.length > 0 },
    { key: 'businessCategory', label: 'Business Category', check: () => !!profile.businessCategory && profile.businessCategory.length > 0 },
    { key: 'businessType', label: 'Business Type', check: () => !!profile.businessType && profile.businessType.trim().length > 0 },
    { key: 'availableCapital', label: 'Available Capital', check: () => typeof profile.availableCapital === 'number' && profile.availableCapital >= 0 },
    { key: 'desiredFunding', label: 'Desired Funding', check: () => typeof profile.desiredFunding === 'number' && profile.desiredFunding > 0 },
    { key: 'dob', label: 'Date of Birth', check: () => !!profile.dob && profile.dob.length > 0 },
    {
      key: 'loanDetails',
      label: 'Loan Details',
      check: () => {
        if (!profile.existingLoans) return true; // Not applicable / no debt
        return (
          Array.isArray(profile.loanDetails) &&
          profile.loanDetails.length > 0 &&
          profile.loanDetails.every((l) => (l.outstandingAmount > 0 || l.monthlyEmi > 0) && !!l.lenderType)
        );
      },
    },
  ];

  const missingFields: string[] = [];
  let completedCount = 0;

  for (const checkpoint of checkpoints) {
    if (checkpoint.check()) {
      completedCount++;
    } else {
      missingFields.push(checkpoint.label);
    }
  }

  const percentage = Math.round((completedCount / checkpoints.length) * 100);

  return {
    percentage,
    completedCount,
    totalCount: checkpoints.length,
    missingFields,
  };
}

/**
 * The subset the advisor can actually save through its `updateProfile` tool.
 * Asking for something it cannot persist would make the user repeat themselves
 * next session, so the prompt only chases these.
 */
export const ADVISOR_COLLECTABLE_FIELDS = [
  'State',
  'District',
  'Village / Town',
  'Business Status',
  'Business Category',
  'Business Type',
  'Available Capital',
  'Desired Funding',
] as const;
