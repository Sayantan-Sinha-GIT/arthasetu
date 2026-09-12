/**
 * Retranslates whole locale files from English, in batches, accepting a string
 * only once it passes every check.
 *
 * Built because five locales — Bodo, Dogri, Konkani, Manipuri and Santali —
 * had been filled with Latin transliterations ("Phwlainwi phwjw") rather than
 * text in their own scripts, and translate-ui-keys.ts sends everything in one
 * request per language, which is right for a handful of new keys and wrong for
 * 761 of them.
 *
 * Every string must:
 *   - keep exactly the placeholders of the English ({count}, {{band}}),
 *   - keep the same number of line breaks,
 *   - not be left in English,
 *   - pass locale-script-purity.cjs: only its own script, plus the Latin words
 *     the human-verified Hindi keeps in Roman script (DSCR, EMI, ArthaSetu...).
 *
 * The one failure no validator can catch is transliteration inside the right
 * script — English sounds spelled out in Devanagari — which is how an earlier
 * run went wrong (see commit a43e6b9). The prompt forbids it by name.
 *
 * Uses Flash-Lite, the project's translation model, so the scarcer Flash quota
 * stays with the live advisor; strings that fail three rounds get two on Flash,
 * in smaller batches. Progress is checkpointed after every batch, and a locale file is written only
 * once all of its strings have passed.
 *
 *   npx tsx scripts/retranslate-locales.ts brx doi kok mni sat
 *   npx tsx scripts/retranslate-locales.ts sat --resume
 *   npx tsx scripts/retranslate-locales.ts sat --limit=40   (trial: prints samples, writes nothing)
 *   npx tsx scripts/retranslate-locales.ts sat --resume --lite-only   (never touches Flash)
 */
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI } from '@google/genai';
import en from '../src/i18n/en';
import hi from '../src/i18n/hi';

 
const purity = require('./locale-script-purity.cjs') as {
  checkOne: (code: string, text: string, options?: { allow?: string[] }) => { foreign: string[]; latin: number };
  DEFAULT_ALLOWED_TOKENS: string[];
};

const LANGS: Record<string, { name: string; script: string; guidance: string }> = {
  brx: {
    name: 'Bodo',
    script: 'Devanagari script',
    guidance:
      'Write the Bodo language (बर’). It shares its script with Hindi but not its words or grammar: never write a Hindi sentence.',
  },
  doi: {
    name: 'Dogri',
    script: 'Devanagari script',
    guidance: 'Write the Dogri language (डोगरी), with Dogri grammar and vocabulary — not Hindi, not Punjabi.',
  },
  kok: {
    name: 'Konkani',
    script: 'Devanagari script',
    guidance: 'Write Konkani (कोंकणी) as it is written in Goa in Devanagari — not Marathi, not Hindi.',
  },
  mni: {
    name: 'Manipuri (Meitei)',
    script: 'Bengali script',
    guidance:
      'Write the Meitei (Manipuri) language in Bengali script (মৈতৈলোন্). It is NOT the Bengali language: use Meitei words and grammar; only the letters are Bengali.',
  },
  sat: {
    name: 'Santali',
    script: 'Ol Chiki script (Unicode U+1C50 to U+1C7F)',
    guidance:
      'Write the Santali language (ᱥᱟᱱᱛᱟᱲᱤ) entirely in Ol Chiki letters — never Devanagari, Bengali, Odia or Latin letters. Sentences may end with ᱾ or a full stop. Some Ol Chiki letters resemble Georgian ones: never output Georgian letters such as ა or ხ.',
  },
};

const DEVANAGARI_SIBLINGS = new Set(['brx', 'doi', 'kok']);
const BATCH = 40;
const DEBUG_RAW = process.argv.includes('--debug-raw');
// Flash is the live advisor's model on the same API key. --lite-only keeps a
// translation run entirely off it, so a long job cannot starve the app.
const LITE_ONLY = process.argv.includes('--lite-only');
const PACE_MS = 4500;
const CKPT_DIR = path.resolve(process.cwd(), 'scripts/output/retranslate');

type Flat = Record<string, string>;

function flatten(obj: unknown, prefix = '', out: Flat = {}): Flat {
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, `${prefix}${k}.`, out);
    else out[`${prefix}${k}`] = String(v);
  }
  return out;
}

function setDeep(target: Record<string, unknown>, dotted: string, value: string) {
  const parts = dotted.split('.');
  let node = target;
  for (const part of parts.slice(0, -1)) {
    if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
    node = node[part] as Record<string, unknown>;
  }
  node[parts[parts.length - 1]] = value;
}

const EN = flatten(en);
const HI = flatten(hi);
const KEYS = Object.keys(EN);

const PLACEHOLDER = /\{\{?[A-Za-z_][A-Za-z0-9_]*\}?\}/g;
const placeholders = (s: string) => (s.match(PLACEHOLDER) ?? []).sort().join(' ');

/** Latin words the human-verified Hindi keeps in Roman script. */
const KEPT_LATIN = [
  ...new Set(
    Object.values(HI).flatMap((v) => v.replace(PLACEHOLDER, ' ').match(/[A-Za-z][A-Za-z0-9@._/:+-]*[A-Za-z0-9]|[A-Za-z]/g) ?? [])
  ),
];
/** The subset worth naming in the prompt: abbreviations, brand and proper names. */
const PROMPT_TOKENS = KEPT_LATIN.filter((t) => /[A-Z]/.test(t) || t.includes('.'));

/** Emoji, arrows, bullets and ticks are copied from the English, not translated. */
const symbolsOf = (s: string) => [...new Set([...s].filter((ch) => (ch.codePointAt(0) ?? 0) >= 0x2000))];

/** A string with no translatable words left (₹, {count}, "PDF") is copied as is. */
function needsTranslation(key: string): boolean {
  let rest = EN[key].replace(PLACEHOLDER, ' ');
  for (const token of [...KEPT_LATIN, ...purity.DEFAULT_ALLOWED_TOKENS].sort((a, b) => b.length - a.length)) {
    rest = rest.split(token).join(' ');
  }
  return /[A-Za-z]/.test(rest);
}

function problems(code: string, key: string, value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return ['missing or empty'];
  const src = EN[key];
  const found: string[] = [];
  if (placeholders(src) !== placeholders(value)) {
    found.push(`placeholders [${placeholders(value)}] should be [${placeholders(src)}]`);
  }
  if ((src.match(/\n/g) ?? []).length !== (value.match(/\n/g) ?? []).length) found.push('line breaks changed');
  if (value.trim() === src.trim()) found.push('left in English');
  const allow = [
    ...purity.DEFAULT_ALLOWED_TOKENS,
    ...KEPT_LATIN,
    ...(src.match(PLACEHOLDER) ?? []),
    ...symbolsOf(src),
  ];
  const r = purity.checkOne(code, value, { allow });
  if (r.latin > 0) found.push(`${r.latin} Latin letter(s)`);
  if (r.foreign.length) found.push(`wrong script: ${r.foreign.join(', ')}`);
  return found;
}

function buildPrompt(code: string, keys: string[]): string {
  const lang = LANGS[code];
  // Plain string maps. Per-key { english, hindi_reference } objects invited the
  // model to answer in that same nested shape.
  const english = Object.fromEntries(keys.map((k) => [k, EN[k]]));
  const hindi = Object.fromEntries(keys.map((k) => [k, HI[k] ?? '']));
  return `You are a professional native translator of ${lang.name}. Translate user-interface text for ArthaSetu, a business-advice app for rural micro-entrepreneurs in India, into ${lang.name} written in ${lang.script}.

${lang.guidance}

Rules:
1. Translate the MEANING into natural, simple ${lang.name} that a rural shopkeeper or farmer would use.
2. Never transliterate English. Spelling English words out in ${lang.script} letters is wrong: "Total Project Capital Outlay" must become real ${lang.name} words, not the English sounds written in another alphabet. Keep an English-origin word only where ${lang.name} speakers genuinely say it (such as mobile or bank), written in ${lang.script}.
3. Every word must be in ${lang.script}. The only exceptions, copied exactly as written: placeholders in braces such as {count} or {{band}}; the brand ArthaSetu; these terms: ${PROMPT_TOKENS.join(', ')}; numbers; emoji and symbols; web addresses.
4. Keep the same line breaks and roughly the same length, and keep any leading emoji or symbol. Short forms of ordinary words are translated like any other word: "/mo" means per month and must be written in ${lang.name}, exactly as the Hindi writes "/माह". Only the listed terms stay in Roman letters.
5. The Hindi is only a guide to meaning and financial terminology. Do not copy it${DEVANAGARI_SIBLINGS.has(code) ? `: the output must be ${lang.name}, not Hindi` : ''}.

Return ONLY one flat JSON object. Its keys must be exactly the keys of the English map below, copied character for character including the dots (for example "nav.home"), and each value must be a single ${lang.name} string. Do not nest keys and do not return objects as values.

English (translate these):
${JSON.stringify(english, null, 1)}

Hindi reference (meaning and terminology only):
${JSON.stringify(hindi, null, 1)}`;
}

/**
 * Accepts the shapes models actually return for dotted keys: the flat object
 * asked for, the same keys nested ({"nav": {"home": ...}}), or each value
 * wrapped in an object ({"nav.home": {"translation": ...}}).
 */
function normalise(raw: unknown, keys: string[]): Record<string, unknown> {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const nested = flatten(obj);
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    let v: unknown = obj[k];
    if (v && typeof v === 'object') {
      v = Object.values(v as Record<string, unknown>).find(
        (x) => typeof x === 'string' && x.trim() !== '' && x !== EN[k] && x !== HI[k]
      );
    }
    out[k] = typeof v === 'string' ? v : nested[k];
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (msg: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const keyMatch = envContent.match(/GEMINI_API_KEY\s*=\s*([^\s\r\n]+)/);
const apiKey = (keyMatch ? keyMatch[1].replace(/["']/g, '') : process.env.GEMINI_API_KEY) || '';
if (!apiKey) {
  console.error('GEMINI_API_KEY missing');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

class QuotaExhausted extends Error {}

async function ask(model: string, prompt: string, temperature = 0.2): Promise<Record<string, unknown>> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature },
      });
      if (DEBUG_RAW) {
        console.log('RAW RESPONSE (first 2500 chars):');
        console.log((res.text ?? '(empty)').slice(0, 2500));
      }
      return JSON.parse((res.text ?? '').replace(/^```json\s*/, '').replace(/```\s*$/, ''));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const limited = /429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(msg);
      // A 503 'high demand' is Google's capacity, not our quota: it clears in
      // tens of seconds, and giving up after a few quick retries dropped whole
      // batches of 40 strings.
      const overloaded = /503|UNAVAILABLE|high demand|overloaded/i.test(msg);
      if (attempt >= 5) {
        // Flash out of quota is not a reason to stop: Flash-Lite has its own.
        if (limited && model !== 'gemini-3.5-flash-lite') {
          log(`   ${model} out of quota; falling back to gemini-3.5-flash-lite for this batch`);
          return ask('gemini-3.5-flash-lite', prompt, temperature);
        }
        if (limited) throw new QuotaExhausted(msg.slice(0, 160));
        if (overloaded && model !== 'gemini-3.5-flash-lite') {
          log(`   ${model} still overloaded; falling back to gemini-3.5-flash-lite for this batch`);
          return ask('gemini-3.5-flash-lite', prompt, temperature);
        }
        throw err;
      }
      const wait = limited ? 30000 * attempt : overloaded ? 15000 * attempt : 5000;
      log(`   ${model} ${limited ? 'rate-limited' : overloaded ? 'overloaded' : 'error'}: ${msg.slice(0, 90)} — waiting ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

function writeLocale(code: string, translated: Flat) {
  const file = path.resolve(process.cwd(), `src/i18n/locales/${code}.json`);
  const raw = fs.readFileSync(file, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const data = JSON.parse(raw);
  for (const [k, v] of Object.entries(translated)) setDeep(data, k, v);
  // JSON.stringify escapes newlines inside strings, so every real newline here
  // is a line break between entries and can take the file's own line ending.
  const body = JSON.stringify(data, null, 2).replace(/\n/g, eol);
  fs.writeFileSync(file, body + (/\r?\n$/.test(raw) ? eol : ''), 'utf8');
}

async function retranslate(code: string, resume: boolean, limit: number) {
  fs.mkdirSync(CKPT_DIR, { recursive: true });
  const ckpt = path.join(CKPT_DIR, limit ? `${code}.trial.json` : `${code}.json`);
  const done: Flat = resume && fs.existsSync(ckpt) ? JSON.parse(fs.readFileSync(ckpt, 'utf8')) : {};
  const save = () => fs.writeFileSync(ckpt, JSON.stringify(done, null, 1), 'utf8');

  for (const k of KEYS) if (!(k in done) && !needsTranslation(k)) done[k] = EN[k];
  let pending = KEYS.filter((k) => !(k in done));
  if (limit) pending = pending.slice(0, limit);
  log(`${code} (${LANGS[code].name}): ${pending.length} to translate, ${KEYS.length - pending.length} already settled`);

  for (let round = 1; round <= 5 && pending.length; round++) {
    const model = round <= 3 || LITE_ONLY ? 'gemini-3.5-flash-lite' : 'gemini-3.5-flash';
    // Malformed JSON replies come mostly from large batches; retries are small.
    const size = round === 1 ? BATCH : 20;
    log(`${code} round ${round}: ${pending.length} strings via ${model}`);
    const failed: string[] = [];
    for (let i = 0; i < pending.length; i += size) {
      const keys = pending.slice(i, i + size);
      let out: Record<string, unknown> = {};
      try {
        // Same prompt, same low temperature, same wrong answer: a string that
        // failed once is retried with more variation.
        out = normalise(await ask(model, buildPrompt(code, keys), round === 1 ? 0.2 : 0.6), keys);
      } catch (err) {
        if (err instanceof QuotaExhausted) {
          save();
          log(`STOPPED ${code}: quota exhausted (${err.message}). Progress saved; re-run with --resume.`);
          process.exit(2);
        }
        log(`   batch error: ${err instanceof Error ? err.message.slice(0, 90) : err}`);
      }
      for (const k of keys) {
        const found = problems(code, k, out[k]);
        if (found.length === 0) done[k] = out[k] as string;
        else {
          failed.push(k);
          if (round >= 4 || DEBUG_RAW) log(`   x ${k}: ${found.join('; ')}`);
        }
      }
      save();
      if (DEBUG_RAW) {
        log(`debug: ${keys.filter((k) => k in done).length}/${keys.length} accepted in this batch; stopping`);
        process.exit(0);
      }
      log(`   ${code} round ${round}: ${Math.min(i + size, pending.length)}/${pending.length} sent, ${Object.keys(done).length}/${KEYS.length} accepted`);
      await sleep(PACE_MS);
    }
    pending = [...new Set(failed)];
  }

  if (limit) {
    const tried = KEYS.filter((k) => needsTranslation(k)).slice(0, limit);
    const accepted = tried.filter((k) => k in done);
    log(`TRIAL ${code}: ${accepted.length}/${tried.length} accepted, ${pending.length} still failing; locale file not touched`);
    for (const k of accepted.slice(0, 12)) log(`   ${k}\n      en: ${EN[k]}\n      ${code}: ${done[k]}`);
    return pending.length === 0;
  }

  if (pending.length) {
    log(`INCOMPLETE ${code}: ${pending.length} string(s) failed every round, file NOT written: ${pending.join(', ')}`);
    return false;
  }
  writeLocale(code, done);
  log(`WROTE ${code}: all ${KEYS.length} strings passed`);
  return true;
}

(async () => {
  const args = process.argv.slice(2);
  const resume = args.includes('--resume');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 0;
  const codes = args.filter((a) => !a.startsWith('--'));
  const unknown = codes.filter((c) => !LANGS[c]);
  if (!codes.length || unknown.length) {
    console.error(`Usage: npx tsx scripts/retranslate-locales.ts <${Object.keys(LANGS).join('|')}>... [--resume]`);
    process.exit(1);
  }
  let allOk = true;
  for (const code of codes) allOk = (await retranslate(code, resume, limit)) && allOk;
  log(allOk ? 'ALL DONE' : 'FINISHED WITH INCOMPLETE LOCALES');
  process.exit(allOk ? 0 : 3);
})();
