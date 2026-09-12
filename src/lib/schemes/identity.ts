/**
 * Telling whether two scheme records describe the same programme.
 *
 * The live directory once held the same scheme up to four times — "PM SVANidhi
 * Scheme", "PM Swanidhi Scheme", "SVANidhi Scheme (PM SVANidhi)" — because
 * machine-generated records spell names, honorifics and acronyms differently.
 * The admin form uses this to warn before a new record repeats an existing one.
 */
import { ALL_INDIAN_REGIONS } from '@/lib/constants/states';
import type { Scheme } from '@/types';

const STATE_WORDS = new Set([
  ...ALL_INDIAN_REGIONS.flatMap((region) => region.toLowerCase().split(/[^a-z]+/)),
  'up', 'mp', 'hp', 'wb', 'tn', 'ap', 'jk', 'uk', 'ts', 'nct',
]);

/** Words that say nothing about which programme a record is. */
const FILLER_WORDS = new Set([
  'the', 'of', 'for', 'and', 'in', 'to', 'a', 'an', 'shri', 'sri', 'smt',
  'scheme', 'schemes', 'yojana', 'yojna', 'programme', 'program', 'mission', 'abhiyan', 'abhijan', 'prakalpa',
  'national', 'state', 'central', 'india', 'indian', 'government', 'govt', 'bharat',
]);

/** Spellings of one word that differ only by transliteration. */
const SPELLINGS: [RegExp, string][] = [
  [/\b(prime\s+minister'?s?|pradhan\s*mantri)\b/g, 'pm'],
  [/\b(chief\s+minister'?s?|mukhya\s*mantri)\b/g, 'cm'],
  [/\batma\s+nirbhar\b/g, 'atmanirbhar'],
  [/\brozgar\b/g, 'rojgar'],
  [/\bswarozgar\b/g, 'swarojgar'],
  [/\bswanidhi\b/g, 'svanidhi'],
  [/\budyam\b/g, 'udyog'],
  [/\bkarmasangsthan\b/g, 'karmasansthan'],
  [/isation\b/g, 'ization'],
];

function words(text: string | undefined): string[] {
  let value = String(text || '').toLowerCase();
  for (const [pattern, replacement] of SPELLINGS) value = value.replace(pattern, replacement);
  return value.split(/[^a-z0-9]+/).filter(Boolean);
}

/** The distinguishing words of a scheme name, without honorific, filler or state. */
export function schemeNameTokens(name: string | undefined): Set<string> {
  return new Set(words(name).filter((w) => !FILLER_WORDS.has(w) && !STATE_WORDS.has(w)));
}

/** "Odisha MKUY" and "MKUY Odisha" are the same acronym. */
export function normaliseShortName(shortName: string | undefined): string {
  return words(shortName).filter((w) => !STATE_WORDS.has(w)).join('');
}

function normaliseUrl(url: string | undefined): string {
  return String(url || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
}

type SchemeIdentity = Pick<Scheme, 'id' | 'name' | 'shortName' | 'officialUrl' | 'governmentLevel' | 'state'>;

/** Why two records look like one programme, or null when they do not. */
export function duplicateReason(a: SchemeIdentity, b: SchemeIdentity): string | null {
  // A central scheme and a state scheme, or schemes of two states, are separate
  // programmes even when named alike ("Startup Policy").
  const scope = (s: SchemeIdentity) => (s.governmentLevel === 'state' ? `state:${String(s.state || '').toLowerCase()}` : 'central');
  if (scope(a) !== scope(b)) return null;

  const shortA = normaliseShortName(a.shortName);
  if (shortA.length >= 3 && shortA === normaliseShortName(b.shortName)) return 'same short name';

  const tokensA = schemeNameTokens(a.name);
  const tokensB = schemeNameTokens(b.name);
  if (tokensA.size === 0 || tokensB.size === 0) return null;
  const shared = [...tokensA].filter((t) => tokensB.has(t)).length;
  if (shared === tokensA.size && shared === tokensB.size) return 'same name';

  const [smaller, larger] = tokensA.size <= tokensB.size ? [tokensA, tokensB] : [tokensB, tokensA];
  const sameUrl = normaliseUrl(a.officialUrl) !== '' && normaliseUrl(a.officialUrl) === normaliseUrl(b.officialUrl);
  if (shared === smaller.size && smaller.size >= 2 && (smaller.size >= 3 || larger.size - smaller.size <= 1 || sameUrl)) {
    return sameUrl ? 'same name words and official website' : 'same name words';
  }
  return null;
}

/** The first existing record that the candidate appears to repeat. */
export function findLikelyDuplicate(
  candidate: SchemeIdentity,
  existing: SchemeIdentity[]
): { scheme: SchemeIdentity; reason: string } | null {
  for (const scheme of existing) {
    if (scheme.id === candidate.id) continue;
    const reason = duplicateReason(candidate, scheme);
    if (reason) return { scheme, reason };
  }
  return null;
}
