import type { Scheme, SchemeMatchResult, UserProfile } from '@/types';

/**
 * Deterministically filters and ranks verified government schemes for a user profile
 * CRITICAL RULE: AI is NOT used to invent schemes. All candidate schemes are real database records.
 */
export function matchSchemesForProfile(
  schemes: Scheme[],
  profile: Partial<UserProfile> | null
): SchemeMatchResult[] {
  if (!profile || !schemes || schemes.length === 0) {
    return [];
  }

  const userState = (profile.state || '').trim().toLowerCase();
  const userCategory = (profile.businessCategory || '').trim().toLowerCase();
  const userBusinessType = (profile.businessType || '').trim().toLowerCase();
  const userStatus = profile.businessStatus || 'planning';
  const isRural = (profile.locality || '').length > 0 || (profile.district || '').length > 0;

  const results: SchemeMatchResult[] = [];

  for (const scheme of schemes) {
    if (!scheme.isActive) continue;

    let score = 0;
    const matchReasons: string[] = [];

    // 1. Geographical Eligibility Check (Central vs State)
    const isCentral = scheme.governmentLevel === 'central';
    const schemeState = (scheme.state || '').trim().toLowerCase();

    if (!isCentral && userState && schemeState !== userState) {
      // Reject state schemes that do not match the user's state
      continue;
    }

    if (!isCentral && schemeState === userState && userState.length > 0) {
      score += 30;
      matchReasons.push(`Official State Scheme for residents of ${scheme.state}`);
    } else if (isCentral) {
      score += 20;
      matchReasons.push('Nationwide Central Government Scheme');
    }

    // 2. Business Category & Activity Alignment
    const targetTypes = (scheme.targetBusinessTypes || []).map((t) => String(t).toLowerCase()).filter(Boolean);
    // A scheme that names no business types is open to every trade. Demanding a
    // match against an empty list made such schemes invisible to everyone.
    const isOpenToAllTypes = targetTypes.length === 0;

    const isExactTypeMatch = targetTypes.some(
      (t) =>
        (userBusinessType && (userBusinessType.includes(t) || t.includes(userBusinessType))) ||
        (userBusinessType.includes('poultry') && t.includes('poultry'))
    );

    const isCategoryMatch = targetTypes.some(
      (t) => userCategory && (userCategory.includes(t) || t.includes(userCategory))
    );

    let hasBusinessAlignment = false;

    if (isExactTypeMatch) {
      score += 40;
      hasBusinessAlignment = true;
      matchReasons.push(`Directly targets ${profile.businessType || 'your business activity'}`);
    } else if (isCategoryMatch) {
      score += 25;
      hasBusinessAlignment = true;
      matchReasons.push(`Applicable to ${profile.businessCategory || 'your industry sector'}`);
    } else if (isOpenToAllTypes) {
      score += 20;
      hasBusinessAlignment = true;
      matchReasons.push('Open to all business types');
    }

    // If there is no alignment with the scheme's target sectors, do not match
    if (!hasBusinessAlignment) {
      continue;
    }

    // 3. Business Stage Alignment (New vs Existing)
    // Optional chaining throughout: a scheme published without an eligibility
    // or benefits block used to throw here and take the whole list down with it.
    const schemeStatus = scheme.eligibility?.businessStatus || 'both';
    if (
      schemeStatus === 'both' ||
      (schemeStatus === 'new' && userStatus === 'planning') ||
      (schemeStatus === 'existing' && userStatus === 'existing')
    ) {
      score += 15;
      matchReasons.push(`Supports ${userStatus === 'planning' ? 'new enterprise setup' : 'business operations'}`);
    }

    // 4. Rural & Priority Category Boost
    const maxSubsidyPercent = scheme.benefits?.maxSubsidyPercent || 0;
    const maxFundingAmount = scheme.benefits?.maxFundingAmount || 0;
    if (isRural && maxSubsidyPercent >= 25) {
      score += 10;
      matchReasons.push(`Enhanced ${maxSubsidyPercent}% subsidy for rural entrepreneurs`);
    }

    // 5. Freshness check: schemes unverified for > 180 days get slight rank penalty (-5)
    const verifiedDateStr = scheme.lastVerifiedDate || scheme.lastVerifiedAt;
    if (verifiedDateStr) {
      const verifiedTime = new Date(verifiedDateStr).getTime();
      const ageDays = (Date.now() - verifiedTime) / (1000 * 60 * 60 * 24);
      if (ageDays > 180) {
        score = Math.max(0, score - 5);
      }
    }

    // Filter by relevance threshold (minimum 50 points required for high confidence match)
    if (score >= 50) {
      let estimatedBenefit = '';
      if (maxSubsidyPercent > 0) {
        estimatedBenefit = `Up to ${maxSubsidyPercent}% Government Subsidy`;
      } else if (maxFundingAmount) {
        estimatedBenefit = `Collateral-free loan up to ₹${(maxFundingAmount / 100000).toFixed(1)} Lakhs`;
      }

      results.push({
        scheme,
        matchScore: Math.min(100, score),
        matchReasons,
        estimatedBenefit,
      });
    }
  }

  // Sort descending by match score
  return results.sort((a, b) => b.matchScore - a.matchScore);
}
