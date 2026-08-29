/**
 * Date and Age Utilities for ArthaSetu
 * Strict DD-MM-YYYY display, ISO YYYY-MM-DD persistence
 */

export const MIN_AGE_YEARS = 18;
export const MAX_AGE_YEARS = 100;

/**
 * Calculates current exact integer age in years from an ISO date string (YYYY-MM-DD)
 */
export function getAgeFromDob(dobIsoString?: string | null): number | null {
  if (!dobIsoString || typeof dobIsoString !== 'string') return null;

  const parts = dobIsoString.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const birthDate = new Date(year, month, day);
  const today = new Date();

  if (isNaN(birthDate.getTime())) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
}

/**
 * Formats an ISO string (YYYY-MM-DD) to visual display format (DD-MM-YYYY)
 */
export function formatIsoToDisplay(isoString?: string | null): string {
  if (!isoString || typeof isoString !== 'string') return '';
  const parts = isoString.split('-');
  if (parts.length !== 3) return isoString;
  const [yyyy, mm, dd] = parts;
  if (!yyyy || !mm || !dd) return isoString;
  return `${dd.padStart(2, '0')}-${mm.padStart(2, '0')}-${yyyy}`;
}

/**
 * Formats day, month, year numbers into an ISO string (YYYY-MM-DD)
 */
export function formatToIso(year: number, monthIndex: number, day: number): string {
  const yyyy = year.toString().padStart(4, '0');
  const mm = (monthIndex + 1).toString().padStart(2, '0');
  const dd = day.toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Validates whether an ISO DOB string meets the required age boundaries (18 <= age <= 100)
 */
export function validateDob(dobIsoString?: string | null): { isValid: boolean; errorKey?: string } {
  if (!dobIsoString) {
    return { isValid: false, errorKey: 'onboarding.dobRequired' };
  }

  const age = getAgeFromDob(dobIsoString);

  if (age === null) {
    return { isValid: false, errorKey: 'onboarding.dobInvalid' };
  }

  if (age < MIN_AGE_YEARS) {
    return { isValid: false, errorKey: 'onboarding.dobMinAge' };
  }

  if (age > MAX_AGE_YEARS) {
    return { isValid: false, errorKey: 'onboarding.dobMaxAge' };
  }

  return { isValid: true };
}

/**
 * Calculates selectable year bounds dynamically from MIN_AGE_YEARS and MAX_AGE_YEARS
 */
export function getSelectableYearRange(): { minYear: number; maxYear: number } {
  const currentYear = new Date().getFullYear();
  return {
    minYear: currentYear - MAX_AGE_YEARS,
    maxYear: currentYear - MIN_AGE_YEARS,
  };
}
