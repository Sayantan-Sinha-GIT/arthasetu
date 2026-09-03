/**
 * Strict whitelist validator: a locale string may contain ONLY characters from
 * its own script block, shared Indic punctuation, and plain ASCII whitespace /
 * punctuation. Anything else — another Indic script, Latin words, or a stray
 * Tibetan glyph from a model that wandered off — is a failure.
 */
const BLOCKS = {
  devanagari: [[0x0900, 0x097F], [0xA8E0, 0xA8FF]],
  bengali: [[0x0980, 0x09FF]],
  gujarati: [[0x0A80, 0x0AFF]],
  gurmukhi: [[0x0A00, 0x0A7F]],
  kannada: [[0x0C80, 0x0CFF]],
  malayalam: [[0x0D00, 0x0D7F]],
  odia: [[0x0B00, 0x0B7F]],
  olchiki: [[0x1C50, 0x1C7F]],
  arabic: [[0x0600, 0x06FF], [0x0750, 0x077F], [0xFB50, 0xFDFF], [0xFE70, 0xFEFF]],
  tamil: [[0x0B80, 0x0BFF]],
  telugu: [[0x0C00, 0x0C7F]],
  meetei: [[0xABC0, 0xABFF]],
};
const LOCALE_SCRIPT = {
  hi: ['devanagari'], doi: ['devanagari'], kok: ['devanagari'], mai: ['devanagari'],
  mr: ['devanagari'], ne: ['devanagari'], sa: ['devanagari'], brx: ['devanagari'],
  bn: ['bengali'], as: ['bengali'], mni: ['bengali', 'meetei'],
  gu: ['gujarati'], pa: ['gurmukhi'], kn: ['kannada'], ml: ['malayalam'],
  or: ['odia'], sat: ['olchiki'], ks: ['arabic'], sd: ['arabic'], ur: ['arabic'],
  ta: ['tamil'], te: ['telugu'],
};
// Danda / double danda / ZWNJ / ZWJ / abbreviation sign are shared across Indic.
const SHARED = new Set([0x0964, 0x0965, 0x200C, 0x200D, 0x0970, 0x00A0]);
// Punctuation, currency and the comparison/maths symbols that appear verbatim
// in every locale — a band label such as "DSCR < 1.2x" keeps its operator.
const ASCII_OK = /[\s.,:;!?()[\]{}\-–—'"%₹0-9<>=+/*&@#]/;

function inBlocks(cp, names) {
  return names.some((n) => BLOCKS[n].some(([a, b]) => cp >= a && cp <= b));
}

/**
 * Latin tokens that legitimately survive translation: brand names, and the
 * financial acronyms the glossary keeps in Roman script across all locales.
 * Matches the rule the translation prompts already state.
 */
const DEFAULT_ALLOWED_TOKENS = [
  'ArthaSetu', 'DSCR', 'PAT', 'EMI', 'CAPEX', 'OPEX', 'PMEGP', 'MUDRA',
  'PMFME', 'NLM', 'CGTMSE', 'SHG', 'MSME', 'AI', 'PDF', 'PM',
];

function checkOne(code, text, options) {
  const allowed = LOCALE_SCRIPT[code];
  if (!allowed) throw new Error('unknown locale ' + code);
  const allowTokens = (options && options.allow) || DEFAULT_ALLOWED_TOKENS;
  // Strip permitted Latin tokens before counting, longest first so that a
  // token containing another is not partially consumed.
  let scanned = String(text);
  // "1.5x" is a ratio suffix, not English — the multiplier reads the same in
  // every script the app supports.
  scanned = scanned.replace(/\d+(?:\.\d+)?\s*x\b/gi, ' ');
  for (const token of [...allowTokens].sort((a, b) => b.length - a.length)) {
    scanned = scanned.split(token).join(' ');
  }
  const foreign = new Set();
  let latin = 0;
  for (const ch of scanned) {
    const cp = ch.codePointAt(0);
    if (SHARED.has(cp)) continue;
    if (cp < 0x0250) {
      if (/[A-Za-z]/.test(ch)) latin++;
      else if (!ASCII_OK.test(ch)) foreign.add('ascii:' + ch);
      continue;
    }
    if (inBlocks(cp, allowed)) continue;
    const owner = Object.keys(BLOCKS).find((n) => inBlocks(cp, [n]));
    foreign.add(owner || 'U+' + cp.toString(16).toUpperCase());
  }
  return { foreign: [...foreign], latin };
}

module.exports = { checkOne, LOCALE_SCRIPT, DEFAULT_ALLOWED_TOKENS };
