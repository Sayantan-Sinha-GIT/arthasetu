import { z } from 'zod';

/**
 * Request shapes for the API routes, checked before any work is done.
 *
 * They describe what the app actually sends — the planner posts the whole
 * wizard state, the plan report posts `texts[]`, read-aloud posts `langCode` —
 * so they check only what a route cannot work without and let everything else
 * through. The routes' own sanitising (sanitizePlanInputs, the translation and
 * speech limits) still fixes the values themselves.
 */

const profileSchema = z.record(z.string(), z.unknown()).nullable().optional();
const languageSchema = z.string().min(2).max(10).optional().default('en');

export const plannerRequestSchema = z.object({
  inputs: z.looseObject({
    businessType: z.string().trim().min(1, 'Business type is required'),
    location: z.string().trim().min(1, 'Location is required'),
  }),
  calculatedValues: z.record(z.string(), z.unknown()),
  userProfile: profileSchema,
  language: languageSchema,
});

export const schemeExplainRequestSchema = z.object({
  scheme: z.looseObject({
    name: z.string().trim().min(1, 'Scheme name is required'),
  }),
  userProfile: profileSchema,
  language: languageSchema,
});

export const translateRequestSchema = z.object({
  text: z.string().optional(),
  texts: z.array(z.unknown()).optional(),
  targetLangCode: z
    .string({ error: 'A supported targetLangCode is required' })
    .min(1, 'A supported targetLangCode is required'),
});

export const ttsRequestSchema = z.object({
  text: z.string({ error: 'text is required' }).trim().min(1, 'text is required'),
  langCode: z.string({ error: 'Unsupported language' }).min(1, 'Unsupported language'),
});

export const pinCodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, 'Invalid 6-digit Indian PIN code');
