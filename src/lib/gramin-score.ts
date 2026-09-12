import type {
  ExistingLoanInput,
  GraminScoreInputs,
  GraminScoreResult,
  GraminScoreBreakdown,
  UserProfile,
} from '@/types';

/**
 * The score inputs a profile implies, before the user adjusts anything on the
 * dashboard card. Shared so the card and the PDF report show the same number.
 */
export function graminInputsFromProfile(profile: Partial<UserProfile> | null | undefined): GraminScoreInputs {
  const profileLoans: ExistingLoanInput[] =
    profile?.loanDetails && profile.loanDetails.length > 0
      ? profile.loanDetails.map((l) => ({
          id: l.id,
          lenderType: l.lenderType === 'informal' ? 'informal_moneylender' : l.lenderType,
          emiAmount: l.monthlyEmi || 0,
          status: 'on_time' as const,
        }))
      : [];

  return {
    monthlyIncome: typeof profile?.monthlyIncome === 'number' ? profile.monthlyIncome : 0,
    monthlyExpenses: typeof profile?.monthlyExpenses === 'number' ? profile.monthlyExpenses : 0,
    revenueConsistency: profile?.monthlyIncome && profile.monthlyIncome > 0 ? 'stable' : 'growing',
    steadyIncomeMonths: profile?.businessStatus === 'existing' ? 12 : 0,
    availableCapital: typeof profile?.availableCapital === 'number' ? profile.availableCapital : 0,
    desiredFunding: typeof profile?.desiredFunding === 'number' ? profile.desiredFunding : 0,
    monthlySavings: typeof profile?.monthlyIncome === 'number' && typeof profile?.monthlyExpenses === 'number'
      ? Math.max(0, profile.monthlyIncome - profile.monthlyExpenses)
      : 0,
    emergencyReserve: typeof profile?.availableCapital === 'number' ? Math.round(profile.availableCapital * 0.2) : 0,
    yearsInOperation: profile?.businessStatus === 'existing' ? 2 : 0,
    isRegistered: !!profile?.businessStatus && profile.businessStatus === 'existing',
    employeeCount: typeof profile?.employeeCount === 'number' ? profile.employeeCount : 0,
    existingLoans: profileLoans,
    keepsRecords: true,
    usesBankAccount: true,
    hasInsurance: false,
    isShgMember: false,
  };
}

/**
 * Deterministic Gramin Credit Readiness Score Calculator
 * Base: 300 points
 * Components (Max 600 points):
 * 1. Cash Flow Health (150 pts)
 * 2. Capital Adequacy (100 pts)
 * 3. Business Stability (100 pts)
 * 4. Debt & Repayment (150 pts)
 * 5. Financial Discipline (100 pts)
 * Total Score Range: 300 to 900
 */
export function calculateGraminScore(inputs: Partial<GraminScoreInputs>): GraminScoreResult {
  let isPartialData = false;

  // ─── 1. Cash Flow Health (Max 150 pts) ───
  let cashFlowScore = 70; // baseline default
  let cashFlowRationale = '';
  const revenue = inputs.monthlyIncome || 0;
  const expenses = inputs.monthlyExpenses || 0;
  const profit = revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const consistency = inputs.revenueConsistency || 'stable';

  if (!inputs.revenueConsistency) isPartialData = true;

  if (revenue <= 0) {
    cashFlowScore = 40;
    cashFlowRationale = 'Pre-revenue enterprise stage';
  } else if (margin >= 30) {
    cashFlowScore = consistency === 'declining' ? 110 : 150;
    cashFlowRationale = `Strong profit margin (${margin.toFixed(1)}%) with ${consistency} revenue`;
  } else if (margin >= 15) {
    cashFlowScore = consistency === 'declining' ? 70 : 110;
    cashFlowRationale = `Healthy profit margin (${margin.toFixed(1)}%) with ${consistency} cash flow`;
  } else if (margin > 0) {
    cashFlowScore = consistency === 'declining' ? 40 : 70;
    cashFlowRationale = `Modest profit margin (${margin.toFixed(1)}%)`;
  } else {
    cashFlowScore = 20;
    cashFlowRationale = 'Operating cash flow is currently negative';
  }

  // ─── 2. Capital Adequacy (Max 100 pts) ───
  let capitalScore = 50;
  let capitalRationale = '';
  const capital = inputs.availableCapital || 0;
  const required = inputs.desiredFunding ? capital + inputs.desiredFunding : capital;
  const selfFundRatio = required > 0 ? (capital / required) * 100 : 50;

  if (inputs.emergencyReserve === undefined) isPartialData = true;

  if (selfFundRatio >= 75) {
    capitalScore = 100;
    capitalRationale = `High self-funding capacity (${selfFundRatio.toFixed(0)}% self-financed)`;
  } else if (selfFundRatio >= 50) {
    capitalScore = 75;
    capitalRationale = `Balanced funding mix (${selfFundRatio.toFixed(0)}% own equity)`;
  } else if (selfFundRatio >= 25) {
    capitalScore = 50;
    capitalRationale = `Moderate own capital contribution (${selfFundRatio.toFixed(0)}%)`;
  } else {
    capitalScore = 25;
    capitalRationale = 'High reliance on external debt or subsidies';
  }

  // Emergency fund bonus (up to 10 pts, capped at 100)
  if (inputs.emergencyReserve && inputs.emergencyReserve > 0) {
    capitalScore = Math.min(100, capitalScore + 10);
    capitalRationale += ' + Emergency reserve buffer verified';
  }

  // ─── 3. Business Stability (Max 100 pts) ───
  let stabilityScore = 25;
  let stabilityRationale = '';
  const years = inputs.yearsInOperation || 0;

  if (years >= 2) {
    stabilityScore = 100;
    stabilityRationale = `Established operating track record (${years} years active)`;
  } else if (years > 0) {
    stabilityScore = 70;
    stabilityRationale = `Early operational business (${years} year in market)`;
  } else {
    stabilityScore = 40;
    stabilityRationale = 'Planning phase / newly registering enterprise';
  }

  // Registration bonus (up to 15 pts, capped at 100)
  if (inputs.isRegistered) {
    stabilityScore = Math.min(100, stabilityScore + 15);
    stabilityRationale += ' (Registered via Udyam/GST)';
  }

  // ─── 4. Debt & Repayment (Max 150 pts) ───
  let debtScore = 150;
  let debtRationale = 'No outstanding loan liabilities self-reported';
  const loans = inputs.existingLoans || [];

  if (loans.length > 0) {
    const totalEmi = loans.reduce((acc, l) => acc + (l.emiAmount || 0), 0);
    const hasDefault = loans.some((l) => l.status === 'defaulted' || l.status === 'occasionally_missed');

    if (hasDefault) {
      debtScore = 10;
      debtRationale = 'Disclosed past missed payments or repayment delays';
    } else if (revenue > 0 && totalEmi > 0) {
      const emiRatio = (totalEmi / revenue) * 100;
      if (emiRatio < 30) {
        debtScore = 120;
        debtRationale = `Clean repayment record with safe EMI burden (${emiRatio.toFixed(0)}% of income)`;
      } else if (emiRatio <= 50) {
        debtScore = 70;
        debtRationale = `Moderate debt burden (EMI consumes ${emiRatio.toFixed(0)}% of income)`;
      } else {
        debtScore = 30;
        debtRationale = `High debt servicing burden (EMI exceeds ${emiRatio.toFixed(0)}% of income)`;
      }
    } else if (totalEmi > 0) {
      debtScore = 60;
      debtRationale = `Active loan servicing liability of ₹${totalEmi.toLocaleString('en-IN')}/mo in pre-revenue stage`;
    } else {
      debtScore = 100;
      debtRationale = `Active credit facility reported (${loans.length} active account${loans.length > 1 ? 's' : ''})`;
    }
  }

  // ─── 5. Financial Discipline (Max 100 pts) ───
  let disciplineScore = 0;
  const disciplineItems: string[] = [];

  if (inputs.keepsRecords) {
    disciplineScore += 25;
    disciplineItems.push('Maintains ledger records');
  }
  if (inputs.usesBankAccount) {
    disciplineScore += 25;
    disciplineItems.push('Active commercial bank account');
  }
  if (inputs.hasInsurance) {
    disciplineScore += 25;
    disciplineItems.push('Protected by insurance');
  }
  if (inputs.isShgMember) {
    disciplineScore += 25;
    disciplineItems.push('SHG/Cooperative member');
  }

  const disciplineRationale = disciplineItems.length > 0
    ? disciplineItems.join(', ')
    : 'No formal financial discipline habits self-reported yet';

  if (!inputs.keepsRecords && !inputs.usesBankAccount && !inputs.hasInsurance && !inputs.isShgMember) {
    isPartialData = true;
  }

  // ─── Final Composite Score ───
  const baseScore = 300;
  const totalScore = Math.min(
    900,
    Math.max(
      300,
      baseScore + cashFlowScore + capitalScore + stabilityScore + debtScore + disciplineScore
    )
  );

  // Band Determination
  let band: GraminScoreResult['band'] = 'Early Stage';
  let bandColor: GraminScoreResult['bandColor'] = 'default';

  if (totalScore >= 750) {
    band = 'Excellent Readiness';
    bandColor = 'success';
  } else if (totalScore >= 650) {
    band = 'Good Readiness';
    bandColor = 'info';
  } else if (totalScore >= 550) {
    band = 'Fair Readiness';
    bandColor = 'warning';
  } else if (totalScore >= 450) {
    band = 'Needs Improvement';
    bandColor = 'danger';
  } else {
    band = 'Early Stage';
    bandColor = 'default';
  }

  const breakdown: GraminScoreBreakdown = {
    cashFlowHealth: { score: cashFlowScore, max: 150, rationale: cashFlowRationale },
    capitalAdequacy: { score: capitalScore, max: 100, rationale: capitalRationale },
    businessStability: { score: stabilityScore, max: 100, rationale: stabilityRationale },
    debtRepayment: { score: debtScore, max: 150, rationale: debtRationale },
    financialDiscipline: { score: disciplineScore, max: 100, rationale: disciplineRationale },
  };

  return {
    score: totalScore,
    band,
    bandColor,
    isPartialData,
    breakdown,
    calculatedAt: new Date().toISOString(),
  };
}

export const GRAMIN_DISCLAIMER =
  'MANDATORY DISCLAIMER: The Gramin Readiness Score (300–900) is an illustrative readiness indicator generated only from information self-reported by you within the ArthaSetu application. It is NOT issued by, verified by, or affiliated with CIBIL, Experian, or any official credit bureau, is NOT a verified credit report, and does NOT guarantee bank loan sanction or government scheme subsidy approval.';
