// ─── Profile choice lists (pure) ───
// The exact values the profile form's dropdowns store. Kept free of Firebase
// imports so the advisor's server route can normalise what the model saves into
// these same values — otherwise the Profile page shows an empty dropdown for an
// answer the user did give.

export const BUSINESS_CATEGORIES = [
  'Livestock & Poultry',
  'Agriculture & Allied',
  'Food Processing & Bakery',
  'Handloom, Textiles & Tailoring',
  'Handicrafts & Artisanal',
  'Retail Shop & Trading',
  'Services & Repair',
  'Manufacturing & Small Workshop',
  'Beauty & Wellness',
  'Logistics & Transport',
  'Other Micro-Enterprise',
];

export const EXPERIENCE_LEVELS = [
  '0-1 years (Beginner / New Venture)',
  '1-3 years',
  '3-5 years',
  '5+ years (Experienced)',
];

export const GENDERS = [
  'Male',
  'Female',
  'Transgender / Other',
  'Prefer not to say',
];

/** Translation key (onboarding.genderOptions) for each stored gender value. */
export const GENDER_KEYS: Record<string, string> = {
  Male: 'male',
  Female: 'female',
  'Transgender / Other': 'other',
  'Prefer not to say': 'preferNot',
};

/** Translation key (graminScore.bands) for each band calculateGraminScore returns. */
export const GRAMIN_BAND_KEYS: Record<string, string> = {
  'Excellent Readiness': 'excellent',
  'Good Readiness': 'good',
  'Fair Readiness': 'fair',
  'Needs Improvement': 'needsImprovement',
  'Early Stage': 'earlyStage',
};
