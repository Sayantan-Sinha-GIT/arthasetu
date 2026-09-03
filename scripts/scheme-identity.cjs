/**
 * Shared scheme identity rules.
 *
 * The seed catalogue was machine-generated and emitted the same scheme many
 * times under variant names — "PM Vishwakarma Scheme", "Prime Minister
 * Vishwakarma Yojana", "Prime Minister's Vishwakarma Kaushal Samman" are one
 * programme. Matching on the raw name therefore misses most duplicates, so
 * names are normalised first: the Hindi and English forms of the honorific
 * collapse together, the interchangeable "Yojana / Scheme / Programme" suffix
 * is dropped, and punctuation and spacing are flattened.
 */

/** Honorific forms that all denote the same "Prime Minister" prefix. */
const PM_FORMS = /\b(prime\s+minister'?s?|pradhan\s+mantri|pm)\b/g;
/** Interchangeable programme suffixes carrying no distinguishing meaning. */
const PROGRAMME_WORDS = /\b(yojana|scheme|programme|program|mission)\b/g;

function normaliseSchemeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(PM_FORMS, 'pm')
    .replace(PROGRAMME_WORDS, ' ')
    // British and American spellings of the same programme must agree.
    .replace(/isation\b/g, 'ization')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normaliseUrl(url) {
  return String(url || '')
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

/**
 * How complete a record is, used to decide which of a duplicate set survives.
 * Rewards the presence of substantive fields rather than raw byte length, so a
 * record with real eligibility rules beats one padded with a long description.
 */
function completenessScore(scheme) {
  let score = 0;
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  score += str(scheme.description).length > 0 ? 2 : 0;
  score += Math.min(str(scheme.description).length / 120, 4);
  score += str(scheme.applicationProcess).length > 0 ? 3 : 0;
  score += str(scheme.officialUrl).length > 0 ? 2 : 0;
  score += str(scheme.shortName).length > 0 ? 1 : 0;
  score += Array.isArray(scheme.requiredDocuments) ? Math.min(scheme.requiredDocuments.length, 6) : 0;
  score += Array.isArray(scheme.tags) ? Math.min(scheme.tags.length, 3) : 0;
  if (scheme.benefits && typeof scheme.benefits === 'object') {
    score += Object.values(scheme.benefits).filter((v) => v !== null && v !== undefined && v !== '').length;
  }
  if (scheme.eligibility && typeof scheme.eligibility === 'object') {
    score += Object.values(scheme.eligibility).filter((v) => v !== null && v !== undefined && v !== '').length;
  }
  score += str(scheme.lastVerifiedDate).length > 0 ? 1 : 0;
  return score;
}

/** Group records by a key function, returning only the groups with collisions. */
function findCollisions(schemes, keyFn) {
  const groups = new Map();
  for (const scheme of schemes) {
    const key = keyFn(scheme);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(scheme);
  }
  return [...groups.entries()].filter(([, group]) => group.length > 1);
}

module.exports = {
  normaliseSchemeName,
  normaliseUrl,
  completenessScore,
  findCollisions,
};
