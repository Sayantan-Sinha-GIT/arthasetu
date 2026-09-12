import { describe, it, expect } from 'vitest';
import { matchSchemesForProfile } from '@/lib/schemes/matcher';
import type { Scheme, UserProfile } from '@/types';

const baseProfile: Partial<UserProfile> = {
  uid: 'test-user',
  name: 'Ramesh Kumar',
  businessType: 'Kirana Store',
  businessCategory: 'Retail',
  businessStatus: 'planning',
  monthlyIncome: 25000,
  monthlyExpenses: 15000,
  availableCapital: 100000,
  state: 'Bihar',
  locality: 'Rural Village',
  language: 'hi',
};

const freshScheme: Scheme = {
  id: 'fresh-scheme',
  name: 'Fresh Rural Enterprise Scheme',
  shortName: 'FRES',
  category: 'Micro-Credit',
  governmentLevel: 'central',
  description: 'Test description for fresh scheme',
  targetBusinessTypes: ['Kirana Store'],
  targetBeneficiaries: ['Rural youth', 'All micro-entrepreneurs'],
  eligibility: {
    ageRange: '18-50',
    businessStatus: 'new',
    otherConditions: [],
  },
  benefits: {
    subsidyDetails: '35% subsidy',
    loanDetails: 'Up to 5 lakhs',
    maxSubsidyPercent: 35,
    maxFundingAmount: 500000,
    otherBenefits: [],
  },
  requiredDocuments: ['Aadhaar'],
  applicationProcess: 'Apply online',
  officialUrl: 'https://example.gov.in',
  sourceName: 'Ministry of MSME',
  lastVerifiedDate: new Date().toISOString().split('T')[0],
  isActive: true,
};

const outdatedScheme: Scheme = {
  ...freshScheme,
  id: 'outdated-scheme',
  name: 'Outdated Rural Enterprise Scheme',
  lastVerifiedDate: '2024-01-01', // > 180 days ago
};

describe('Scheme Freshness & Matcher', () => {
  it('penalizes match score by 5 points if last verified date is older than 180 days', () => {
    const freshMatches = matchSchemesForProfile([freshScheme], baseProfile);
    const outdatedMatches = matchSchemesForProfile([outdatedScheme], baseProfile);

    expect(freshMatches.length).toBe(1);
    expect(outdatedMatches.length).toBe(1);
    expect(freshMatches[0].matchScore).toBe(outdatedMatches[0].matchScore + 5);
  });
});
