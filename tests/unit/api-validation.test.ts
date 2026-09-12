import { describe, it, expect } from 'vitest';
import {
  plannerRequestSchema,
  schemeExplainRequestSchema,
  translateRequestSchema,
  ttsRequestSchema,
  pinCodeSchema,
} from '@/lib/validation/api-schemas';

// The payloads below are the shapes the app really sends, so a schema that
// drifts from the client breaks here before it breaks a user's request.
describe('API request schemas', () => {
  describe('pinCodeSchema', () => {
    it('accepts valid 6-digit Indian PIN codes', () => {
      expect(pinCodeSchema.safeParse('700001').success).toBe(true);
      expect(pinCodeSchema.safeParse('110001').success).toBe(true);
    });

    it('rejects invalid PIN codes', () => {
      expect(pinCodeSchema.safeParse('012345').success).toBe(false);
      expect(pinCodeSchema.safeParse('7000').success).toBe(false);
      expect(pinCodeSchema.safeParse('ABCDEF').success).toBe(false);
    });
  });

  describe('plannerRequestSchema', () => {
    const wizardPayload = {
      inputs: {
        businessType: 'Dairy Farm',
        location: 'Kolkata',
        planType: 'startup',
        businessScale: 'Micro',
        equipmentCost: 50000,
        monthlyRentUtilities: 3000,
        unitsSoldPerMonth: 3000,
      },
      calculatedValues: { monthlyNetProfit: 12000, fundingGap: 0 },
      userProfile: null,
      language: 'hi',
    };

    it('accepts the planner wizard payload and keeps every input field', () => {
      const result = plannerRequestSchema.safeParse(wizardPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.inputs.monthlyRentUtilities).toBe(3000);
        expect(result.data.language).toBe('hi');
      }
    });

    it('defaults the language to English', () => {
      const { language: _unused, ...withoutLanguage } = wizardPayload;
      void _unused;
      const result = plannerRequestSchema.safeParse(withoutLanguage);
      expect(result.success && result.data.language).toBe('en');
    });

    it('rejects a plan without a business type or location', () => {
      expect(plannerRequestSchema.safeParse({
        ...wizardPayload,
        inputs: { ...wizardPayload.inputs, businessType: '   ' },
      }).success).toBe(false);
      expect(plannerRequestSchema.safeParse({
        ...wizardPayload,
        inputs: { ...wizardPayload.inputs, location: undefined },
      }).success).toBe(false);
    });

    it('rejects a request without the calculated values', () => {
      const { calculatedValues: _unused, ...withoutCalculation } = wizardPayload;
      void _unused;
      expect(plannerRequestSchema.safeParse(withoutCalculation).success).toBe(false);
    });
  });

  describe('schemeExplainRequestSchema', () => {
    it('accepts a full scheme record and a profile', () => {
      expect(schemeExplainRequestSchema.safeParse({
        scheme: { id: 'pmegp', name: 'PMEGP', benefits: { maxSubsidyPercent: 35 } },
        userProfile: { state: 'West Bengal' },
        language: 'bn',
      }).success).toBe(true);
    });

    it('rejects a missing scheme', () => {
      expect(schemeExplainRequestSchema.safeParse({ language: 'en' }).success).toBe(false);
    });
  });

  describe('translateRequestSchema', () => {
    it('accepts a single message and a batch of report strings', () => {
      expect(translateRequestSchema.safeParse({ text: 'Hello', targetLangCode: 'hi' }).success).toBe(true);
      expect(translateRequestSchema.safeParse({ texts: ['Summary', 'Risk'], targetLangCode: 'ta' }).success).toBe(true);
    });

    it('rejects a request without a target language', () => {
      expect(translateRequestSchema.safeParse({ text: 'Hello' }).success).toBe(false);
    });
  });

  describe('ttsRequestSchema', () => {
    it('accepts the read-aloud payload', () => {
      expect(ttsRequestSchema.safeParse({ text: 'Namaste', langCode: 'hi' }).success).toBe(true);
    });

    it('rejects blank text', () => {
      expect(ttsRequestSchema.safeParse({ text: '   ', langCode: 'hi' }).success).toBe(false);
    });
  });
});
