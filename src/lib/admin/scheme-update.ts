import type { Scheme } from '@/types';

/**
 * What an AI-detected scheme update may change, and how each field is edited.
 *
 * The AI reports changes as field paths ("benefits.maxSubsidyPercent"). Every
 * path is checked against this list, and every value is converted to the
 * field's type, before an administrator sees it. A path the AI invents, or a
 * value that restates the current one, never reaches the review screen. The
 * scheme id, level and state are deliberately absent: those identify the
 * scheme, and a circular does not move a scheme from one state to another.
 *
 * Pure, with no Firebase import, so the browser, the API route and the tests
 * share one definition.
 */

export type SchemeFieldKind = 'text' | 'longtext' | 'number' | 'list' | 'select' | 'boolean';

export interface SchemeFieldDefinition {
  path: string;
  label: string;
  kind: SchemeFieldKind;
  options?: { value: string; label: string }[];
}

export const SCHEME_UPDATE_FIELDS: SchemeFieldDefinition[] = [
  { path: 'name', label: 'Full scheme name', kind: 'text' },
  { path: 'shortName', label: 'Short name', kind: 'text' },
  { path: 'category', label: 'Category', kind: 'text' },
  { path: 'description', label: 'Description', kind: 'longtext' },
  { path: 'benefits.maxSubsidyPercent', label: 'Maximum subsidy (%)', kind: 'number' },
  { path: 'benefits.maxFundingAmount', label: 'Maximum funding (₹)', kind: 'number' },
  { path: 'benefits.subsidyDetails', label: 'Subsidy details', kind: 'longtext' },
  { path: 'benefits.loanDetails', label: 'Loan terms', kind: 'longtext' },
  { path: 'benefits.otherBenefits', label: 'Other benefits', kind: 'list' },
  { path: 'eligibility.ageRange', label: 'Age requirement', kind: 'text' },
  { path: 'eligibility.incomeLimit', label: 'Income limit', kind: 'text' },
  { path: 'eligibility.education', label: 'Education requirement', kind: 'text' },
  {
    path: 'eligibility.businessStatus',
    label: 'Who can apply',
    kind: 'select',
    options: [
      { value: 'both', label: 'New and existing businesses' },
      { value: 'new', label: 'New businesses only' },
      { value: 'existing', label: 'Existing businesses only' },
    ],
  },
  { path: 'eligibility.otherConditions', label: 'Other eligibility conditions', kind: 'list' },
  { path: 'targetBusinessTypes', label: 'Target business types', kind: 'list' },
  { path: 'targetBeneficiaries', label: 'Target beneficiaries', kind: 'list' },
  { path: 'requiredDocuments', label: 'Required documents', kind: 'list' },
  { path: 'applicationProcess', label: 'Application process', kind: 'longtext' },
  { path: 'officialUrl', label: 'Official portal link', kind: 'text' },
  { path: 'sourceName', label: 'Nodal ministry or department', kind: 'text' },
  { path: 'isActive', label: 'Scheme is open for applications', kind: 'boolean' },
];

const FIELDS_BY_PATH = new Map(SCHEME_UPDATE_FIELDS.map((field) => [field.path, field]));

export function getSchemeUpdateField(path: string): SchemeFieldDefinition | undefined {
  return FIELDS_BY_PATH.get(path);
}

export interface SchemeChange {
  old: unknown;
  new: unknown;
  /** The line of the notice that states the change, quoted by the AI. */
  evidence?: string;
}

export type SchemeChanges = Record<string, SchemeChange>;

/** A change as the AI reports it, before it is checked. */
export interface ProposedSchemeChange {
  field: string;
  newValue: unknown;
  evidence?: unknown;
}

export function getPathValue(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setPathValue(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = target;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== 'object') current[part] = {};
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

/** "₹50 lakh" → 5000000, "35%" → 35, "1,25,000" → 125000. */
function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const text = value.toLowerCase();
  const digits = text.replace(/[^0-9.]/g, '');
  if (!digits || digits.split('.').length > 2) return undefined;
  let number = Number(digits);
  if (/\bcrore|\bcr\b/.test(text)) number *= 1e7;
  else if (/\blakh|\blac\b/.test(text)) number *= 1e5;
  return Number.isFinite(number) ? number : undefined;
}

function parseList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  if (typeof value !== 'string') return undefined;
  const lines = value.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean);
  // A single line is more likely a comma-separated list than one long item.
  return lines.length === 1 ? lines[0].split(',').map((item) => item.trim()).filter(Boolean) : lines;
}

/**
 * The value in the field's own type, or undefined when it cannot be one
 * ("thirty-five" for a number, "sometimes" for who can apply).
 */
export function normaliseSchemeFieldValue(field: SchemeFieldDefinition, value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  switch (field.kind) {
    case 'number':
      return parseNumber(value);
    case 'list':
      return parseList(value);
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const text = value.trim().toLowerCase();
        if (['true', 'yes', 'active', 'open'].includes(text)) return true;
        if (['false', 'no', 'inactive', 'closed', 'discontinued'].includes(text)) return false;
      }
      return undefined;
    case 'select': {
      const text = String(value).trim().toLowerCase();
      return field.options?.some((option) => option.value === text) ? text : undefined;
    }
    default:
      return typeof value === 'object' ? undefined : String(value).trim();
  }
}

function comparable(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    return items.length ? JSON.stringify(items) : '';
  }
  if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ').toLowerCase();
  return JSON.stringify(value);
}

/** Equal for review purposes: ignores case, spacing, and empty-versus-missing. */
export function schemeValuesEqual(a: unknown, b: unknown): boolean {
  return comparable(a) === comparable(b);
}

/**
 * An administrator-facing problem with a value about to be published, or null.
 */
export function validateSchemeChangeValue(field: SchemeFieldDefinition, value: unknown): string | null {
  if (field.kind === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 'Enter a number of 0 or more.';
    if (field.path === 'benefits.maxSubsidyPercent' && value > 100) return 'A percentage cannot be above 100.';
  }
  if ((field.path === 'name' || field.path === 'shortName') && !String(value ?? '').trim()) {
    return 'This cannot be empty.';
  }
  if (field.path === 'officialUrl' && !/^https?:\/\/\S+\.\S+/.test(String(value ?? '').trim())) {
    return 'Enter a full link starting with https://';
  }
  return null;
}

/**
 * Turns the AI's report into reviewable changes: known fields only, values in
 * the field's type, and only where the value actually differs from the record.
 * When the AI reports a field twice, the later report wins.
 */
export function buildSchemeChanges(current: Scheme, proposed: ProposedSchemeChange[]): SchemeChanges {
  const changes: SchemeChanges = {};
  for (const item of proposed) {
    const field = getSchemeUpdateField(String(item?.field ?? ''));
    if (!field) continue;
    const next = normaliseSchemeFieldValue(field, item.newValue);
    if (next === undefined || validateSchemeChangeValue(field, next)) continue;
    const old = getPathValue(current, field.path);
    if (schemeValuesEqual(old, next)) continue;
    const evidence = typeof item.evidence === 'string' ? item.evidence.trim().slice(0, 300) : '';
    changes[field.path] = { old: old ?? null, new: next, ...(evidence ? { evidence } : {}) };
  }
  return changes;
}

/** A copy of the scheme with the changes applied. */
export function applySchemeChanges<T extends object>(scheme: T, changes: SchemeChanges): T {
  const copy = JSON.parse(JSON.stringify(scheme)) as Record<string, unknown>;
  for (const [path, change] of Object.entries(changes)) setPathValue(copy, path, change.new);
  return copy as T;
}

/** A value as an administrator reads it. */
export function formatSchemeValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '(empty)';
  if (Array.isArray(value)) return value.length ? value.map((item) => `• ${item}`).join('\n') : '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}
