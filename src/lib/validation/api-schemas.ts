import { z } from 'zod';

export const planInputsSchema = z.object({
  businessType: z.string().min(1, 'Business type is required'),
  location: z.string().min(1, 'Location is required'),
  businessScale: z.string().optional(),
  equipmentCost: z.number().nonnegative().optional().default(0),
  setupCost: z.number().nonnegative().optional().default(0),
  initialInventory: z.number().nonnegative().optional().default(0),
  workingCapitalReserve: z.number().nonnegative().optional().default(0),
  monthlyRawMaterials: z.number().nonnegative().optional().default(0),
  monthlyRent: z.number().nonnegative().optional().default(0),
  monthlyStaffSalaries: z.number().nonnegative().optional().default(0),
  monthlyUtilities: z.number().nonnegative().optional().default(0),
  monthlyOtherExpenses: z.number().nonnegative().optional().default(0),
  unitPrice: z.number().nonnegative().optional().default(0),
  expectedMonthlySalesVolume: z.number().nonnegative().optional().default(0),
  ownerEquityContribution: z.number().nonnegative().optional().default(0),
  desiredLoanTenureMonths: z.number().positive().optional().default(36),
  assumedAnnualInterestRate: z.number().nonnegative().optional().default(9.5),
  existingMonthlyRevenue: z.number().nonnegative().optional().default(0),
  existingMonthlyCost: z.number().nonnegative().optional().default(0),
  existingLoans: z.number().nonnegative().optional().default(0),
  isExistingBusiness: z.boolean().optional().default(false),
});

export const plannerRouteSchema = z.object({
  inputs: planInputsSchema,
  calculatedValues: z.record(z.string(), z.unknown()).optional(),
  userProfile: z.record(z.string(), z.unknown()).nullable().optional(),
  language: z.string().min(2).max(10).optional().default('en'),
});

export const translateMessageSchema = z.object({
  texts: z.array(z.string()).min(1, 'At least one text string is required'),
  targetLangCode: z.string().min(2, 'Target language code is required'),
});

export const ttsRouteSchema = z.object({
  text: z.string().min(1, 'Text is required').max(2000, 'Text exceeds 2000 characters'),
  language: z.string().min(2).max(10).optional().default('en'),
  voice: z.string().optional(),
});

export const schemesExplainRouteSchema = z.object({
  scheme: z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Scheme name is required'),
    description: z.string().optional().default(''),
    category: z.string().optional().default(''),
    eligibility: z.record(z.string(), z.unknown()).optional().default({}),
  }),
  userProfile: z.record(z.string(), z.unknown()).nullable().optional(),
  language: z.string().min(2).max(10).optional().default('en'),
});

export const pincodeRouteSchema = z.object({
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid 6-digit Indian PIN code'),
});

export const aiPlannerNarrativeSchema = z.object({
  executiveSummary: z.string().min(10, 'Executive summary is too short'),
  keyAssumptions: z.array(z.string()).default([]),
  riskAnalysis: z.array(z.string()).default([]),
  actionableNextSteps: z.array(z.string()).default([]),
});
