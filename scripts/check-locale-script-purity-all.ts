/**
 * Checks EVERY string of every locale against that locale's script.
 *
 * check-locale-script-purity.cjs reads a single string per locale
 * (tts.voiceUnavailable). That one string happened to be in the right script
 * for Bodo, Dogri, Konkani, Manipuri and Santali, so all five passed while
 * 91-94% of their text was Latin transliteration. This walks all of them.
 *
 * Allowed in any locale, exactly as retranslate-locales.ts allows them: the
 * placeholders of the English string, the Latin words the human-verified Hindi
 * keeps in Roman script (DSCR, EMI, ArthaSetu...), and symbols copied from the
 * English. A string with nothing translatable in it (₹, "PDF") is skipped.
 *
 *   npx tsx scripts/check-locale-script-purity-all.ts            # all 22
 *   npx tsx scripts/check-locale-script-purity-all.ts sat mni    # some
 *   npx tsx scripts/check-locale-script-purity-all.ts --max-percent=10
 *
 * --max-percent sets how much of a locale may sit outside its script before
 * it fails (default 0). A small tolerance keeps a stray acronym from blocking
 * a release while still catching the failure this exists for: a whole locale
 * quietly written in Latin letters, which the one-string check waved through.
 */
import * as fs from 'fs';
import * as path from 'path';
import en from '../src/i18n/en';
import hi from '../src/i18n/hi';
import bn from '../src/i18n/bn';

 
const purity = require('./locale-script-purity.cjs') as {
  checkOne: (code: string, text: string, options?: { allow?: string[] }) => { foreign: string[]; latin: number };
  LOCALE_SCRIPT: Record<string, string[]>;
  DEFAULT_ALLOWED_TOKENS: string[];
};

type Flat = Record<string, string>;

function flatten(obj: unknown, prefix = '', out: Flat = {}): Flat {
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, `${prefix}${k}.`, out);
    else out[`${prefix}${k}`] = String(v);
  }
  return out;
}

const EN = flatten(en);
const HI = flatten(hi);
const PLACEHOLDER = /\{\{?[A-Za-z_][A-Za-z0-9_]*\}?\}/g;

const KEPT_LATIN = [
  ...new Set(
    Object.values(HI).flatMap((v) => v.replace(PLACEHOLDER, ' ').match(/[A-Za-z][A-Za-z0-9@._/:+-]*[A-Za-z0-9]|[A-Za-z]/g) ?? [])
  ),
];
const symbolsOf = (s: string) => [...new Set([...s].filter((ch) => (ch.codePointAt(0) ?? 0) >= 0x2000))];

function translatable(english: string): boolean {
  let rest = english.replace(PLACEHOLDER, ' ');
  for (const token of [...KEPT_LATIN, ...purity.DEFAULT_ALLOWED_TOKENS].sort((a, b) => b.length - a.length)) {
    rest = rest.split(token).join(' ');
  }
  return /[A-Za-z]/.test(rest);
}

function load(code: string): Flat {
  if (code === 'hi') return HI;
  if (code === 'bn') return flatten(bn);
  return flatten(JSON.parse(fs.readFileSync(path.resolve(process.cwd(), `src/i18n/locales/${code}.json`), 'utf8')));
}

const args = process.argv.slice(2);
const maxArg = args.find((a) => a.startsWith('--max-percent='));
const maxPercent = maxArg ? Number(maxArg.split('=')[1]) : 0;
const requested = args.filter((a) => !a.startsWith('--'));
const codes = requested.length ? requested : Object.keys(purity.LOCALE_SCRIPT);
let failing = 0;

for (const code of codes) {
  const data = load(code);
  const bad: { key: string; why: string }[] = [];
  let checked = 0;
  for (const [key, english] of Object.entries(EN)) {
    const value = data[key];
    if (value === undefined || !translatable(english)) continue;
    checked++;
    if (value.trim() === english.trim()) {
      bad.push({ key, why: 'left in English' });
      continue;
    }
    const allow = [
      ...purity.DEFAULT_ALLOWED_TOKENS,
      ...KEPT_LATIN,
      ...(english.match(PLACEHOLDER) ?? []),
      ...symbolsOf(english),
    ];
    const r = purity.checkOne(code, value, { allow });
    if (r.latin > 0 || r.foreign.length) {
      bad.push({ key, why: [r.latin ? `${r.latin} Latin letters` : '', r.foreign.length ? `foreign ${r.foreign.join(',')}` : ''].filter(Boolean).join('; ') });
    }
  }
  const pct = checked ? Math.round((100 * bad.length) / checked) : 0;
  if (bad.length === 0) {
    console.log(`✅ ${code}: all ${checked} strings in script`);
  } else if (pct <= maxPercent) {
    console.log(`⚠️  ${code}: ${bad.length}/${checked} strings (${pct}%) out of script, within the ${maxPercent}% tolerance`);
  } else {
    failing++;
    console.log(`❌ ${code}: ${bad.length}/${checked} strings (${pct}%) out of script`);
    for (const b of bad.slice(0, 3)) console.log(`     ${b.key}: ${b.why} — ${JSON.stringify(data[b.key]).slice(0, 70)}`);
  }
}

console.log(failing ? `\n${failing} locale(s) have strings outside their script.` : '\nEvery string of every checked locale is in its own script.');
process.exit(failing ? 1 : 0);
