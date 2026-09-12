// ─── Turning what the AI advisor saves into valid profile values (pure) ───
//
// The advisor's updateProfile tool receives whatever the model writes: "23 aug
// 1990", "woman", "2-3 years", "5 lakh", "orissa", or an empty string when it is
// unsure. Written as-is, those broke the profile in quiet ways — an empty string
// erased a real answer, a date the form could not parse showed as blank, and a
// category or experience value outside the dropdown's options appeared unset, so
// the next save from the Profile page wiped it. Everything goes through here.

import type { LoanDetail, UserProfile } from '@/types';
import { BUSINESS_CATEGORIES, EXPERIENCE_LEVELS, GENDERS } from '@/lib/constants/profile-options';
import { canonicalDistrict, canonicalRegion } from '@/lib/constants/region-match';
import { formatToIso, validateDob } from '@/lib/utils/date';

export interface NormalizedProfileUpdates {
  /** Valid values, in the exact form the profile form stores. */
  updates: Partial<UserProfile>;
  /** Fields that were given but could not be saved, with the reason, for the model to relay. */
  rejected: Record<string, string>;
}

const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const cleanText = (v: unknown, max: number) => String(v).replace(/\s+/g, ' ').trim().slice(0, max);
const lettersOnly = (v: string) => v.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const monthNumber = (word: string) => MONTHS.indexOf(word.slice(0, 3)) + 1; // 0 when not a month

/**
 * A date of birth as YYYY-MM-DD. Accepts ISO, day-first numeric dates (the
 * Indian convention: 23/08/1990) and dates with month names. Null if unreadable
 * or not a real calendar date.
 */
export function parseDateOfBirth(value: unknown): string | null {
  const s = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/(\d)(st|nd|rd|th)\b/g, '$1')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ');
  let year: number;
  let month: number;
  let day: number;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) {
    [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) {
    [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = s.match(/^(\d{1,2})[ -]([a-z]+)\.?[ -](\d{4})$/))) {
    [day, month, year] = [Number(m[1]), monthNumber(m[2]), Number(m[3])];
  } else if ((m = s.match(/^([a-z]+)\.? (\d{1,2}) (\d{4})$/))) {
    [month, day, year] = [monthNumber(m[1]), Number(m[2]), Number(m[3])];
  } else {
    return null;
  }
  if (month < 1 || month > 12 || day < 1) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return formatToIso(year, month - 1, day);
}

/** A rupee amount or count: 50000, "50,000", "₹5,000", "5 lakh", "50k", "1.5 crore". */
export function parseAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  const s = String(value ?? '')
    .toLowerCase()
    .replace(/₹|,|\brs\.?|\brupees?\b|\binr\b/g, '')
    .trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(k|thousand|hazaa?r|lakhs?|lacs?|crores?|cr)?$/);
  if (!m) return null;
  const unit = m[2] || '';
  const multiplier = /^(k|thousand|haza)/.test(unit) ? 1e3 : /^la/.test(unit) ? 1e5 : /^cr/.test(unit) ? 1e7 : 1;
  const amount = Math.round(parseFloat(m[1]) * multiplier);
  return Number.isFinite(amount) && amount <= 1e11 ? amount : null;
}

function parseYesNo(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').trim().toLowerCase();
  if (/^(yes|y|true|haan|ha|han|ji|हाँ|हां|হ্যাঁ)$/.test(s)) return true;
  if (/^(no|n|false|nahi|nahin|na|none|नहीं|না)$/.test(s)) return false;
  return null;
}

function normalizeStatus(value: unknown): 'existing' | 'planning' | null {
  const s = String(value).toLowerCase();
  if (/not yet|haven'?t|have not|plan|idea|future|want to start|will start/.test(s)) return 'planning';
  if (/exist|running|already|operat|established|current/.test(s)) return 'existing';
  if (/new|start/.test(s)) return 'planning';
  return null;
}

/** The dropdown's category for a category or trade description; "Other" rather than nothing. */
function normalizeCategory(value: unknown): string {
  const s = String(value).toLowerCase();
  const exact = BUSINESS_CATEGORIES.find((c) => lettersOnly(c) === lettersOnly(s));
  if (exact) return exact;
  const byKeyword: Array<[RegExp, string]> = [
    [/poultry|livestock|dairy|milk|goat|cattle|cow|buffalo|pig|fish|duck|sheep|animal/, 'Livestock & Poultry'],
    [/beauty|salon|parlou?r|spa|wellness|cosmetic/, 'Beauty & Wellness'],
    [/agri|farm|crop|vegetable|horticulture|mushroom|nursery|seed|organic/, 'Agriculture & Allied'],
    [/food|bakery|pickle|snack|sweet|restaurant|tea|catering|dhaba|mill|spice/, 'Food Processing & Bakery'],
    [/handloom|textile|tailor|saree|sari|garment|weav|stitch|cloth|embroider|boutique/, 'Handloom, Textiles & Tailoring'],
    [/handicraft|craft|artisan|pottery|bamboo|jewel|carpet/, 'Handicrafts & Artisanal'],
    [/transport|logistic|taxi|delivery|truck|rickshaw|courier/, 'Logistics & Transport'],
    [/manufactur|workshop|fabricat|welding|carpent|furniture|factory/, 'Manufacturing & Small Workshop'],
    [/repair|service|mobile|electric|plumb|laundry|photo|computer|cyber/, 'Services & Repair'],
    [/retail|shop|store|kirana|grocery|trading|trade|wholesale|general store/, 'Retail Shop & Trading'],
  ];
  return byKeyword.find(([pattern]) => pattern.test(s))?.[1] ?? 'Other Micro-Enterprise';
}

function normalizeExperience(value: unknown): string | null {
  const s = String(value).toLowerCase().trim();
  const exact = EXPERIENCE_LEVELS.find((level) => level.toLowerCase() === s);
  if (exact) return exact;
  const [beginner, oneToThree, threeToFive, fivePlus] = EXPERIENCE_LEVELS;
  if (/\b(new|beginner|fresher|none|no experience|just start|starting)\b|less than (a|one|1) year/.test(s)) return beginner;
  const numbers = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (numbers.length === 0) return null;
  if (/month/.test(s) && !/year/.test(s)) return numbers[0] < 12 ? beginner : oneToThree;
  const years = numbers.length >= 2 ? (numbers[0] + numbers[1]) / 2 : numbers[0];
  if (years < 1) return beginner;
  if (years < 3) return oneToThree;
  if (years < 5) return threeToFive;
  return fivePlus;
}

function normalizeGender(value: unknown): string | null {
  const s = String(value).toLowerCase().trim();
  const exact = GENDERS.find((g) => g.toLowerCase() === s);
  if (exact) return exact;
  const [male, female, other, preferNot] = GENDERS;
  if (/prefer|not say|decline|rather not/.test(s)) return preferNot;
  if (/trans|other|non.?binary|third/.test(s)) return other;
  if (/^f$|female|woman|women|lady|girl|mahila|महिला|स्त्री|মহিলা/.test(s)) return female;
  if (/^m$|\bmale\b|\bman\b|\bmen\b|boy|purush|पुरुष|পুরুষ/.test(s)) return male;
  return null;
}

function normalizeLender(value: unknown): LoanDetail['lenderType'] {
  const s = String(value ?? '').toLowerCase();
  if (/nbfc|mfi|micro.?finance/.test(s)) return 'nbfc';
  if (/shg|self.?help|co-?op|society/.test(s)) return 'shg_cooperative';
  if (/money.?lender|informal|relative|friend|private|family|mahajan|sahukar/.test(s)) return 'informal';
  return 'bank';
}

const AMOUNT_FIELDS = ['availableCapital', 'desiredFunding', 'monthlyIncome', 'monthlyExpenses', 'annualTurnover'] as const;

export function normalizeAdvisorProfileUpdates(
  args: Record<string, unknown> | null | undefined,
  existing?: Partial<UserProfile> | null
): NormalizedProfileUpdates {
  const a = args || {};
  const updates: Record<string, unknown> = {};
  const rejected: Record<string, string> = {};
  // Blank means "not given", never "erase": a model unsure of a value sends "".
  const given = (field: string) => !isBlank(a[field]);

  if (given('name')) {
    const name = cleanText(a.name, 80);
    if (name.length >= 2) updates.name = name;
    else rejected.name = 'too short to be a name';
  }
  if (given('businessType')) updates.businessType = cleanText(a.businessType, 100);
  if (given('businessCategory')) updates.businessCategory = normalizeCategory(a.businessCategory);
  if (given('locality')) updates.locality = cleanText(a.locality, 100);

  if (given('businessStatus')) {
    const status = normalizeStatus(a.businessStatus);
    if (status) updates.businessStatus = status;
    else rejected.businessStatus = 'must be "existing" (already running) or "planning" (not started yet)';
  }
  if (given('businessExperience')) {
    const experience = normalizeExperience(a.businessExperience);
    if (experience) updates.businessExperience = experience;
    else rejected.businessExperience = 'ask how many years they have worked in this trade';
  }
  if (given('gender')) {
    const gender = normalizeGender(a.gender);
    if (gender) updates.gender = gender;
    else rejected.gender = `must be one of: ${GENDERS.join(', ')}`;
  }
  if (given('dob')) {
    const iso = parseDateOfBirth(a.dob);
    if (!iso) rejected.dob = 'could not be read as a date; ask for the day, month and year';
    else if (!validateDob(iso).isValid) rejected.dob = 'the person must be between 18 and 100 years old; ask them to check the year';
    else updates.dob = iso;
  }

  if (given('state')) {
    const state = canonicalRegion(String(a.state));
    if (state) updates.state = state;
    else rejected.state = 'not a recognised Indian state or union territory';
  }
  const effectiveState = (updates.state as string | undefined) ?? (given('state') ? undefined : existing?.state);
  if (given('district')) {
    if (effectiveState) {
      const district = canonicalDistrict(effectiveState, String(a.district));
      if (district) updates.district = district;
      else rejected.district = `not a district of ${effectiveState} on record; ask them to confirm the district name`;
    } else {
      updates.district = cleanText(a.district, 80);
    }
  } else if (updates.state && existing?.district && !canonicalDistrict(updates.state as string, existing.district)) {
    // A new state makes the old district wrong; leaving it would contradict the state.
    updates.district = '';
  }

  if (given('pinCode')) {
    const pin = String(a.pinCode).replace(/\s/g, '');
    if (/^[1-9]\d{5}$/.test(pin)) updates.pinCode = pin;
    else rejected.pinCode = 'must be 6 digits and cannot start with 0';
  }

  for (const field of AMOUNT_FIELDS) {
    if (!given(field)) continue;
    const amount = parseAmount(a[field]);
    if (amount !== null) updates[field] = amount;
    else rejected[field] = 'not an amount in rupees';
  }
  if (given('employeeCount')) {
    const count = parseAmount(a.employeeCount);
    if (count !== null && count <= 100000) updates.employeeCount = count;
    else rejected.employeeCount = 'not a number of people';
  }

  if (given('existingLoans')) {
    const hasLoans = parseYesNo(a.existingLoans);
    if (hasLoans !== null) {
      updates.existingLoans = hasLoans;
      if (!hasLoans) updates.loanDetails = [];
    }
  }
  if (Array.isArray(a.loans)) {
    const stamp = Date.now();
    const loans: LoanDetail[] = a.loans
      .filter((loan): loan is Record<string, unknown> => !!loan && typeof loan === 'object')
      .map((loan, i) => ({
        id: `loan_${stamp}_${i}`,
        lenderType: normalizeLender(loan.lenderType),
        outstandingAmount: parseAmount(loan.outstandingAmount) ?? 0,
        monthlyEmi: parseAmount(loan.monthlyEmi) ?? 0,
      }))
      .filter((loan) => loan.outstandingAmount > 0 || loan.monthlyEmi > 0);
    if (loans.length > 0) {
      updates.loanDetails = loans;
      updates.existingLoans = true;
    }
  }

  return { updates: updates as Partial<UserProfile>, rejected };
}
