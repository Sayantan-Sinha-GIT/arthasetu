import { describe, it, expect } from 'vitest';
import {
  applySchemeChanges,
  buildSchemeChanges,
  getSchemeUpdateField,
  normaliseSchemeFieldValue,
  schemeValuesEqual,
  validateSchemeChangeValue,
} from '@/lib/admin/scheme-update';
import { htmlToText, parseChangeReport, readNoticeFromUrl, NoticeError } from '@/lib/admin/draft-scheme-update';
import type { Scheme } from '@/types';

const scheme: Scheme = {
  id: 'central-pmegp',
  name: 'Prime Minister Employment Generation Programme',
  shortName: 'PMEGP',
  category: 'Micro-Credit',
  governmentLevel: 'central',
  description: 'Credit-linked subsidy for new micro-enterprises.',
  targetBusinessTypes: ['Manufacturing', 'Services'],
  targetBeneficiaries: ['Rural youth'],
  eligibility: { ageRange: '18 years and above', businessStatus: 'new', otherConditions: [] },
  benefits: { maxSubsidyPercent: 35, maxFundingAmount: 5000000, subsidyDetails: '15% to 35%', otherBenefits: [] },
  requiredDocuments: ['Aadhaar', 'Project report'],
  applicationProcess: 'Apply on the KVIC portal.',
  officialUrl: 'https://example.com/pmegp',
  sourceName: 'Ministry of MSME',
  lastVerifiedDate: '2026-01-01',
  isActive: true,
};

describe('buildSchemeChanges', () => {
  it('keeps a real change with its evidence, in the field type', () => {
    const changes = buildSchemeChanges(scheme, [
      { field: 'benefits.maxFundingAmount', newValue: '₹75 lakh', evidence: 'The project limit is raised to Rs 75 lakh.' },
    ]);
    expect(changes).toEqual({
      'benefits.maxFundingAmount': {
        old: 5000000,
        new: 7500000,
        evidence: 'The project limit is raised to Rs 75 lakh.',
      },
    });
  });

  it('drops unknown fields, restated values and unusable values', () => {
    const changes = buildSchemeChanges(scheme, [
      { field: 'id', newValue: 'something-else' },
      { field: 'benefits.inventedBonus', newValue: 10 },
      { field: 'benefits.maxSubsidyPercent', newValue: '35%' },
      { field: 'shortName', newValue: '  pmegp ' },
      { field: 'eligibility.businessStatus', newValue: 'sometimes' },
      { field: 'benefits.maxSubsidyPercent', newValue: 140 },
    ]);
    expect(changes).toEqual({});
  });

  it('reads a list from text and keeps the whole updated list', () => {
    const changes = buildSchemeChanges(scheme, [
      { field: 'requiredDocuments', newValue: 'Aadhaar\nProject report\nUdyam registration' },
    ]);
    expect(changes.requiredDocuments.new).toEqual(['Aadhaar', 'Project report', 'Udyam registration']);
  });
});

describe('field values', () => {
  it('normalises booleans, selects and numbers', () => {
    expect(normaliseSchemeFieldValue(getSchemeUpdateField('isActive')!, 'discontinued')).toBe(false);
    expect(normaliseSchemeFieldValue(getSchemeUpdateField('eligibility.businessStatus')!, 'Both')).toBe('both');
    expect(normaliseSchemeFieldValue(getSchemeUpdateField('benefits.maxFundingAmount')!, '1,25,000')).toBe(125000);
    expect(normaliseSchemeFieldValue(getSchemeUpdateField('benefits.maxFundingAmount')!, '2 crore')).toBe(20000000);
  });

  it('flags values an administrator must fix before publishing', () => {
    const percent = getSchemeUpdateField('benefits.maxSubsidyPercent')!;
    expect(validateSchemeChangeValue(percent, Number.NaN)).toMatch(/number/);
    expect(validateSchemeChangeValue(percent, 120)).toMatch(/100/);
    expect(validateSchemeChangeValue(getSchemeUpdateField('officialUrl')!, 'kvic portal')).toMatch(/https/);
    expect(validateSchemeChangeValue(percent, 40)).toBeNull();
  });

  it('treats case, spacing and empty-versus-missing as equal', () => {
    expect(schemeValuesEqual(' Ministry of MSME ', 'ministry  of msme')).toBe(true);
    expect(schemeValuesEqual(undefined, '')).toBe(true);
    expect(schemeValuesEqual([], null)).toBe(true);
    expect(schemeValuesEqual(['A', 'B'], ['B', 'A'])).toBe(false);
  });

  it('applies changes to nested fields without touching the rest', () => {
    const updated = applySchemeChanges(scheme, {
      'benefits.maxSubsidyPercent': { old: 35, new: 40 },
      'eligibility.ageRange': { old: '18 years and above', new: '18 to 45 years' },
    });
    expect(updated.benefits.maxSubsidyPercent).toBe(40);
    expect(updated.benefits.maxFundingAmount).toBe(5000000);
    expect(updated.eligibility.ageRange).toBe('18 to 45 years');
    expect(scheme.benefits.maxSubsidyPercent).toBe(35);
  });
});

describe('reading a notice', () => {
  it('turns a web page into readable lines', () => {
    const text = htmlToText(
      '<html><head><title>x</title><style>p{}</style></head><body><script>alert(1)</script>' +
        '<h1>Office Memorandum</h1><p>Subsidy raised to 40%&nbsp;for&amp; women.</p><ul><li>Item one</li></ul></body></html>'
    );
    expect(text).toBe('Office Memorandum\nSubsidy raised to 40% for& women.\nItem one');
  });

  it('parses the change report, with or without a code fence', () => {
    const report = parseChangeReport(
      '```json\n{"summaryOfChanges":"Limit raised.","changes":[{"field":"benefits.maxFundingAmount","newValue":7500000,"evidence":"raised"}]}\n```'
    );
    expect(report.summary).toBe('Limit raised.');
    expect(report.proposed).toHaveLength(1);
    expect(parseChangeReport('{"proposedChanges":{"shortName":{"old":"A","new":"B"}}}').proposed).toEqual([
      { field: 'shortName', newValue: 'B' },
    ]);
  });

  it('refuses links to private or local addresses without fetching them', async () => {
    await expect(readNoticeFromUrl('http://localhost:3000/secret')).rejects.toBeInstanceOf(NoticeError);
    await expect(readNoticeFromUrl('http://192.168.1.10/notice.pdf')).rejects.toBeInstanceOf(NoticeError);
    await expect(readNoticeFromUrl('file:///etc/passwd')).rejects.toBeInstanceOf(NoticeError);
  });
});
