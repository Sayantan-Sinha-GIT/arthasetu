// ─── ArthaSetu TypeScript Interfaces ───
// Central type definitions for the entire application

import { Timestamp } from 'firebase/firestore';

export interface LoanDetail {
  id: string;
  lenderType: 'bank' | 'nbfc' | 'shg_cooperative' | 'informal';
  outstandingAmount: number;
  monthlyEmi: number;
}

// ─── User Profile ───
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  language: string;
  theme: 'light' | 'dark';

  // Location
  state: string;
  district: string;
  locality: string; // village/town/post office
  roadName?: string; // specific road/house
  pinCode?: string;

  // Business
  businessStatus: 'existing' | 'planning' | '';
  businessCategory: string;
  businessType: string;
  businessExperience: string; // e.g., "0-1 years", "1-3 years", "3-5 years", "5+ years"

  // Financial
  availableCapital: number;
  desiredFunding: number;
  monthlyIncome: number;
  monthlyExpenses: number;

  // Optional eligibility (collected when relevant)
  dob?: string; // ISO format: YYYY-MM-DD
  gender?: string;
  employeeCount?: number;
  existingLoans?: boolean;
  loanDetails?: LoanDetail[];
  annualTurnover?: number;

  // Profile completeness & consent
  onboardingComplete: boolean;
  consentGiven?: boolean;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Financial Plan ───
export interface PlanInputs {
  businessType: string;
  businessScale: string; // e.g. "500 Broilers per batch", "10 Sewing Machines"
  location: string;
  planType?: 'startup' | 'existing_expansion';
  
  // Existing Business Specifics (Branch 2)
  currentMonthlyRevenue?: number;
  currentMonthlyExpenses?: number;
  expansionGoal?: string;
  expansionEquipmentCost?: number;
  expansionWorkingCapital?: number;
  projectedRevenueIncreasePercent?: number;

  // Startup Costs (Investment)
  equipmentCost: number;
  setupCost: number; // shed / shop renovation
  initialInventory: number; // first batch of raw materials / stock
  workingCapitalReserve: number; // safety buffer for 1-2 months
  
  // Revenue Model
  unitPrice: number;
  unitsSoldPerMonth: number;
  otherMonthlyRevenue: number;
  
  // Operating Expenses (Monthly)
  monthlyRawMaterials: number;
  monthlyRentUtilities: number;
  monthlyLabor: number;
  monthlyTransportPackaging: number;
  monthlyMaintenanceOther: number;
  
  // Funding & Loan
  availableSavings: number;
  loanInterestRatePercent: number; // e.g. 9.5%
  loanTenureMonths: number; // e.g. 36 or 60
}

export interface CalculatedValues {
  totalInitialCost: number;
  fundingGap: number;
  monthlyGrossRevenue: number;
  monthlyOperatingExpenses: number;
  monthlyLoanEmi: number;
  monthlyTotalExpenses: number;
  monthlyNetProfit: number;
  profitMarginPercent: number;
  breakEvenMonths: number | null; // null or Infinity if operating at loss
  breakEvenUnitsPerMonth: number;
  annualNetProfit: number;
  // Existing Business Expansion metrics:
  currentMonthlyProfit?: number;
  incrementalMonthlyProfit?: number;
}

// ─── Gramin Credit Score (Self-Reported Readiness 300–900) ───
export interface ExistingLoanInput {
  id: string;
  lenderType: 'bank' | 'nbfc' | 'shg_cooperative' | 'informal_moneylender';
  emiAmount: number;
  status: 'on_time' | 'occasionally_missed' | 'defaulted';
}

export interface GraminScoreInputs {
  // Cash flow
  monthlyIncome: number;
  monthlyExpenses: number;
  revenueConsistency: 'stable' | 'growing' | 'seasonal' | 'declining';
  steadyIncomeMonths?: number;

  // Capital
  availableCapital: number;
  desiredFunding: number;
  monthlySavings?: number;
  emergencyReserve?: number;

  // Business stability
  yearsInOperation: number;
  isRegistered: boolean;
  employeeCount?: number;

  // Debt & Repayment
  existingLoans: ExistingLoanInput[];
  borrowingHistoryYears?: number;

  // Financial Discipline
  keepsRecords: boolean;
  usesBankAccount: boolean;
  hasInsurance: boolean;
  isShgMember: boolean;
}

export interface GraminScoreBreakdown {
  cashFlowHealth: { score: number; max: 150; rationale: string };
  capitalAdequacy: { score: number; max: 100; rationale: string };
  businessStability: { score: number; max: 100; rationale: string };
  debtRepayment: { score: number; max: 150; rationale: string };
  financialDiscipline: { score: number; max: 100; rationale: string };
}

export interface GraminScoreResult {
  score: number; // 300 - 900
  band: 'Excellent Readiness' | 'Good Readiness' | 'Fair Readiness' | 'Needs Improvement' | 'Early Stage';
  bandColor: 'success' | 'info' | 'warning' | 'danger' | 'default';
  isPartialData: boolean;
  breakdown: GraminScoreBreakdown;
  calculatedAt: string;
}

export interface Plan {
  id: string;
  userId: string;
  title: string;
  businessType: string;
  inputs: PlanInputs;
  calculatedValues: CalculatedValues;
  aiNarrative: {
    executiveSummary: string;
    keyAssumptions: string[];
    riskAnalysis: string[];
    actionableNextSteps: string[];
  };
  schemeRefs?: string[];
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Saved Advice ───
export interface Advice {
  id: string;
  userId: string;
  title: string;
  category: string; // e.g., "business-strategy", "financial", "scheme-info", "general"
  content: string;
  businessContext: string;
  createdAt: Timestamp;
}

// ─── Government Scheme ───
export interface Scheme {
  id: string;
  name: string;
  shortName: string;
  category: string; // e.g., "Agro & Livestock", "Micro-Credit", "Manufacturing", "Youth Self-Employment"
  governmentLevel: 'central' | 'state';
  state?: string; // for state/UT schemes across all 28 states & 8 UTs (e.g. "Assam", "Maharashtra", "Bihar", "Delhi", etc.)
  description: string;
  targetBusinessTypes: string[];
  targetBeneficiaries: string[];

  // Eligibility
  eligibility: {
    ageRange?: string;
    incomeLimit?: string;
    education?: string;
    businessStatus?: 'new' | 'existing' | 'both';
    otherConditions: string[];
  };

  // Benefits
  benefits: {
    loanDetails?: string;
    subsidyDetails?: string;
    maxSubsidyPercent?: number;
    maxFundingAmount?: number;
    otherBenefits: string[];
  };

  // Application
  requiredDocuments: string[];
  applicationProcess: string;
  officialUrl: string;
  sourceName: string;
  lastVerifiedDate: string; // ISO date string

  // Status
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SchemeMatchResult {
  scheme: Scheme;
  matchScore: number;
  matchReasons: string[];
  estimatedBenefit?: string;
}

// ─── Scheme Update History ───
export interface SchemeUpdateRecord {
  id: string;
  schemeId: string;
  schemeName?: string;
  adminId: string;
  adminEmail: string;
  timestamp: Timestamp;
  sourceUrl: string;
  proposedChanges: Record<string, { old: unknown; new: unknown }>;
  status: 'pending' | 'approved' | 'rejected';
  publishedChanges?: Record<string, { old: unknown; new: unknown }>;
  notes?: string;
}

// ─── Chat / Advisor ───
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

// ─── UI State ───
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'disconnected';

export interface NumberTag {
  value: number;
  source: 'user-provided' | 'app-calculated' | 'ai-estimated';
  label: string;
}

// ─── API Response Types ───
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AdvisorRequest {
  message: string;
  conversationHistory: ChatMessage[];
  language: string;
}

export interface PlanGenerateRequest {
  inputs: PlanInputs;
  calculatedValues: CalculatedValues;
  userProfile: Partial<UserProfile>;
  language: string;
}

export interface SchemeMatchRequest {
  userProfile: Partial<UserProfile>;
  businessType?: string;
  language: string;
}
