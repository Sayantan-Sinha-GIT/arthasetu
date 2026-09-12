import { describe, expect, it } from 'vitest';
import { resolveReplyLanguage } from '@/lib/lang/detectScript';
import { looksLikeEverydayBusinessMessage, ADVISOR_ERROR_MARKER, formatIndianRupees, detectRomanIndianLanguage } from '@/lib/advisor/understanding';
import { buildAdvisorSystemPrompt } from '@/lib/prompts/advisor';
import { findLikelyDuplicate } from '@/lib/schemes/identity';
import { toFunctionResponsePayload } from '@/lib/gemini';
import type { Scheme } from '@/types';

describe('resolveReplyLanguage', () => {
  it('keeps the app language for Roman-letter messages', () => {
    expect(resolveReplyLanguage('mujhe dukan ke liye loan chahiye', 'hi')).toBe('hi');
    expect(resolveReplyLanguage('loan', 'ta')).toBe('ta');
    expect(resolveReplyLanguage('I want a loan', 'en')).toBe('en');
  });

  it('keeps the app language when it shares the message script', () => {
    expect(resolveReplyLanguage('मला दुकान सुरू करायचे आहे', 'mr')).toBe('mr');
    expect(resolveReplyLanguage('মোৰ দোকান আছে', 'as')).toBe('as');
  });

  it('follows a message written in a different script', () => {
    expect(resolveReplyLanguage('मुझे लोन चाहिए', 'en')).toBe('hi');
    expect(resolveReplyLanguage('எனக்கு கடன் வேண்டும்', 'hi')).toBe('ta');
  });
});

describe('looksLikeEverydayBusinessMessage', () => {
  it('lets short and everyday business messages through without a model call', () => {
    for (const message of ['loan', 'murgi palan', 'bakri palan me kitna kharcha lagega bhai', 'मुझे अपनी दुकान के लिए पैसा चाहिए कहाँ से मिलेगा', 'আমার দোকানের জন্য ঋণ কিভাবে পাবো বলুন']) {
      expect(looksLikeEverydayBusinessMessage(message)).toBe(true);
    }
  });

  it('leaves longer unrelated requests to the scope check', () => {
    expect(looksLikeEverydayBusinessMessage('write python code for a linked list please')).toBe(false);
    expect(looksLikeEverydayBusinessMessage('   ')).toBe(false);
  });

  it('uses a marker no answer would contain', () => {
    expect(ADVISOR_ERROR_MARKER).toMatch(/^\[\[.+\]\]$/);
  });
});

describe('detectRomanIndianLanguage', () => {
  it('recognises Hindi and Bengali typed in Roman letters', () => {
    expect(detectRomanIndianLanguage('murgi palan kaise shuru kare')).toBe('Hindi');
    expect(detectRomanIndianLanguage('loan chahiye')).toBe('Hindi');
    expect(detectRomanIndianLanguage('mera kirana dukan hai, kitna loan milega?')).toBe('Hindi');
    expect(detectRomanIndianLanguage('amar mudi dokan ache, loan pabo?')).toBe('Bengali');
  });

  it('leaves English and Indian scripts alone', () => {
    expect(detectRomanIndianLanguage('How do I start a poultry farm?')).toBeNull();
    expect(detectRomanIndianLanguage('I want a loan for my shop in the village')).toBeNull();
    expect(detectRomanIndianLanguage('मुझे लोन चाहिए')).toBeNull();
  });

  it('names the language in the prompt only for an English app', () => {
    const rule = 'typed in Roman (English) letters';
    expect(buildAdvisorSystemPrompt(null, 'en', 'loan chahiye')).toContain(`Hindi ${rule}`);
    expect(buildAdvisorSystemPrompt(null, 'en', 'How do I get a loan?')).not.toContain(rule);
    expect(buildAdvisorSystemPrompt(null, 'hi', 'loan chahiye')).not.toContain(rule);
  });
});

describe('formatIndianRupees', () => {
  it('writes amounts in lakh and crore', () => {
    expect(formatIndianRupees(300000)).toBe('₹3 lakh');
    expect(formatIndianRupees(250000)).toBe('₹2.5 lakh');
    expect(formatIndianRupees(80000000)).toBe('₹8 crore');
    expect(formatIndianRupees(50000)).toBe('₹50,000');
    expect(formatIndianRupees(0)).toBeUndefined();
    expect(formatIndianRupees(undefined)).toBeUndefined();
  });
});

describe('toFunctionResponsePayload', () => {
  it('wraps a list, which Gemini refuses as a tool result', () => {
    expect(toFunctionResponsePayload([{ name: 'PMEGP' }])).toEqual({ results: [{ name: 'PMEGP' }] });
    expect(toFunctionResponsePayload({ success: true })).toEqual({ success: true });
    expect(toFunctionResponsePayload(null)).toEqual({ result: null });
  });
});

describe('buildAdvisorSystemPrompt', () => {
  it('tells the model how to read imperfect messages and write simply', () => {
    const prompt = buildAdvisorSystemPrompt(null, 'hi');
    expect(prompt).toContain('UNDERSTANDING THE USER');
    expect(prompt).toContain('HOW TO WRITE FOR THEM');
    expect(prompt).toContain('do lakh = 200000');
  });

  it('allows a Roman-letter reply only when the app is in English', () => {
    expect(buildAdvisorSystemPrompt(null, 'en')).toContain('same simple Roman-letter style');
    expect(buildAdvisorSystemPrompt(null, 'hi')).not.toContain('same simple Roman-letter style');
  });
});

describe('findLikelyDuplicate', () => {
  const scheme = (fields: Partial<Scheme>): Scheme => ({ governmentLevel: 'central', ...fields } as Scheme);
  const existing = [
    scheme({ id: 'central-svanidhi', name: "PM Street Vendor's AtmaNirbhar Nidhi (PM SVANidhi)", shortName: 'PM SVANidhi', officialUrl: 'https://pmsvanidhi.mohua.gov.in/' }),
    scheme({ id: 'assam-cmaaa', name: "Chief Minister's Atmanirbhar Asom Abhijan (CMAAA)", shortName: 'CMAAA', governmentLevel: 'state', state: 'Assam' }),
    scheme({ id: 'odisha-mkuy', name: 'Mukhyamantri Krushi Udyog Yojana (MKUY Odisha)', shortName: 'Odisha MKUY', governmentLevel: 'state', state: 'Odisha' }),
    scheme({ id: 'coir', name: 'Coir Udyami Yojana', shortName: 'CUY' }),
    scheme({ id: 'raj-startup', name: 'Rajasthan Startup Policy', shortName: 'Raj Startup', governmentLevel: 'state', state: 'Rajasthan' }),
  ];

  it('catches the variant spellings that filled the directory', () => {
    expect(findLikelyDuplicate(scheme({ id: 'x1', name: 'PM Swanidhi Scheme', shortName: 'PM Swanidhi' }), existing)?.scheme.id).toBe('central-svanidhi');
    expect(findLikelyDuplicate(scheme({ id: 'x2', name: "Chief Minister's Atma Nirbhar Asom Abhijan", shortName: 'ANAA', governmentLevel: 'state', state: 'Assam' }), existing)?.scheme.id).toBe('assam-cmaaa');
    expect(findLikelyDuplicate(scheme({ id: 'x3', name: 'Mukhyamantri Krushi Udyog Yojana', shortName: 'MKUY Odisha', governmentLevel: 'state', state: 'Odisha' }), existing)?.scheme.id).toBe('odisha-mkuy');
  });

  it('does not flag different programmes', () => {
    expect(findLikelyDuplicate(scheme({ id: 'y1', name: 'Mahila Coir Yojana', shortName: 'MCY' }), existing)).toBeNull();
    expect(findLikelyDuplicate(scheme({ id: 'y2', name: 'Startup Haryana Policy', shortName: 'Startup Haryana', governmentLevel: 'state', state: 'Haryana' }), existing)).toBeNull();
    expect(findLikelyDuplicate(scheme({ id: 'y3', name: 'PM SVANidhi Scheme', shortName: 'PM SVANidhi', governmentLevel: 'state', state: 'Delhi' }), existing)).toBeNull();
  });
});
