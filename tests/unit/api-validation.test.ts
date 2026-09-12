import { describe, it, expect } from 'vitest';
import {
  planInputsSchema,
  translateMessageSchema,
  ttsRouteSchema,
  pincodeRouteSchema,
  aiPlannerNarrativeSchema,
} from '@/lib/validation/api-schemas';

describe('API Input Validation Schemas', () => {
  describe('pincodeRouteSchema', () => {
    it('accepts valid 6-digit Indian PIN codes', () => {
      expect(pincodeRouteSchema.safeParse({ pincode: '700001' }).success).toBe(true);
      expect(pincodeRouteSchema.safeParse({ pincode: '110001' }).success).toBe(true);
    });

    it('rejects invalid PIN codes', () => {
      expect(pincodeRouteSchema.safeParse({ pincode: '012345' }).success).toBe(false);
      expect(pincodeRouteSchema.safeParse({ pincode: '7000' }).success).toBe(false);
      expect(pincodeRouteSchema.safeParse({ pincode: 'ABCDEF' }).success).toBe(false);
    });
  });

  describe('ttsRouteSchema', () => {
    it('accepts valid TTS payloads', () => {
      expect(ttsRouteSchema.safeParse({ text: 'Namaste', language: 'hi' }).success).toBe(true);
    });

    it('rejects empty TTS text', () => {
      expect(ttsRouteSchema.safeParse({ text: '', language: 'hi' }).success).toBe(false);
    });
  });

  describe('translateMessageSchema', () => {
    it('accepts valid translate arrays', () => {
      expect(translateMessageSchema.safeParse({ texts: ['Hello'], targetLangCode: 'hi' }).success).toBe(true);
    });

    it('rejects empty arrays', () => {
      expect(translateMessageSchema.safeParse({ texts: [], targetLangCode: 'hi' }).success).toBe(false);
    });
  });

  describe('planInputsSchema', () => {
    it('accepts valid business plan inputs', () => {
      expect(planInputsSchema.safeParse({
        businessType: 'Dairy Farm',
        location: 'Bihar',
        equipmentCost: 50000,
      }).success).toBe(true);
    });

    it('rejects negative numbers for monetary values', () => {
      expect(planInputsSchema.safeParse({
        businessType: 'Dairy Farm',
        location: 'Bihar',
        equipmentCost: -50000,
      }).success).toBe(false);
    });
  });

  describe('aiPlannerNarrativeSchema', () => {
    it('validates structured AI planner narrative output', () => {
      const res = aiPlannerNarrativeSchema.safeParse({
        executiveSummary: 'This is a viable financial model for micro enterprise.',
        keyAssumptions: ['Stable demand'],
        riskAnalysis: ['Price surges'],
        actionableNextSteps: ['Apply for loan'],
      });
      expect(res.success).toBe(true);
    });

    it('rejects incomplete narrative or summary below 10 characters', () => {
      expect(aiPlannerNarrativeSchema.safeParse({
        executiveSummary: 'Short',
      }).success).toBe(false);
      expect(aiPlannerNarrativeSchema.safeParse({}).success).toBe(false);
    });
  });
});
