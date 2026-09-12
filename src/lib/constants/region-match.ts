// ─── Matching free-text places to the canonical state and district names ───
// People (and the AI advisor) write "orissa", "jammu & kashmir", "west bengal";
// the profile form, the scheme matcher and the district dropdown only recognise
// the exact names in the lists below. Pure, so server and browser share it.

import { ALL_INDIAN_REGIONS } from '@/lib/constants/states';
import { STATE_DISTRICTS_MAP, getDistrictsByState } from '@/lib/constants/districts';

/** Lowercase letters only, "&" read as "and": "Jammu & Kashmir" equals "jammu and kashmir". */
export function regionKey(name: string | undefined | null): string {
  return String(name ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
}

/** Old or informal names still in everyday use, keyed like regionKey. */
const REGION_ALIASES: Record<string, string> = {
  orissa: 'odisha',
  pondicherry: 'puducherry',
  uttaranchal: 'uttarakhand',
  newdelhi: 'delhi',
  nctofdelhi: 'delhi',
  jandk: 'jammuandkashmir',
  jk: 'jammuandkashmir',
  bengal: 'westbengal',
  up: 'uttarpradesh',
  mp: 'madhyapradesh',
  ap: 'andhrapradesh',
  tn: 'tamilnadu',
  wb: 'westbengal',
};

/** Exactly one candidate, or none — a guess between two places is worse than asking. */
function unique<T>(items: T[]): T | null {
  return items.length === 1 ? items[0] : null;
}

/** The canonical state or union territory for a name, or null if it is not one. */
export function canonicalRegion(name: string | undefined | null): string | null {
  const key = regionKey(name);
  if (!key) return null;
  const target = REGION_ALIASES[key] ?? key;
  const regions = ALL_INDIAN_REGIONS as readonly string[];
  const exact = regions.find((r) => regionKey(r) === target);
  if (exact) return exact;
  if (target.length < 5) return null;
  return unique(regions.filter((r) => regionKey(r).includes(target)));
}

/** The canonical district of `state` for a name, or null if the state has no such district. */
export function canonicalDistrict(state: string, district: string | undefined | null): string | null {
  const key = regionKey(district);
  if (!key) return null;
  const districts = getDistrictsByState(state);
  const exact = districts.find((d) => regionKey(d) === key);
  if (exact) return exact;
  if (key.length < 5) return null;
  return unique(districts.filter((d) => regionKey(d).includes(key) || key.includes(regionKey(d))));
}

/**
 * The state named or implied by a free-text location line such as
 * "Kalindi Housing Estate, Kolkata": a state name if one appears, otherwise the
 * state of a district that does. Empty when it cannot be told.
 */
export function findRegionInText(text: string | undefined | null): string {
  const key = regionKey(text);
  if (!key) return '';
  const regions = ALL_INDIAN_REGIONS as readonly string[];
  const named = regions
    .filter((r) => key.includes(regionKey(r)))
    .sort((a, b) => regionKey(b).length - regionKey(a).length);
  if (named.length > 0) return named[0];

  const statesByDistrict = new Set<string>();
  for (const [state, districts] of Object.entries(STATE_DISTRICTS_MAP)) {
    if (districts.some((d) => regionKey(d).length >= 5 && key.includes(regionKey(d)))) {
      statesByDistrict.add(state);
    }
  }
  return statesByDistrict.size === 1 ? [...statesByDistrict][0] : '';
}
