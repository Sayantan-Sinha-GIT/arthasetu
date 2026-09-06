/**
 * Runs the segment-boundary de-duplication across every one of the 23 languages
 * we render, using each language's OWN product text rather than sentences
 * invented for the test.
 *
 * Why this exists separately from `test-speech-transcript-dedupe.ts`: that file
 * proves the logic on the reported Bengali defect. This one proves it does not
 * quietly stop working in a script nobody on the team reads. Three things vary
 * by language and each can defeat a plain string comparison:
 *
 *   1. SENTENCE MARKS. The danda (Hindi, Bengali, Assamese, Odia, Punjabi,
 *      Nepali, Maithili, Sanskrit), the Arabic full stop and question mark
 *      (Urdu, Sindhi, Kashmiri), the Ol Chiki mucaad (Santali) and the Meetei
 *      Mayek cheikhei (Manipuri) all appear in our locale files.
 *   2. ZERO-WIDTH JOINERS. Kannada, Konkani, Malayalam, Manipuri, Marathi,
 *      Odia, Sindhi and Telugu carry U+200C/U+200D inside words.
 *   3. UNICODE NORMALISATION. Eight locales carry text that is not in NFC, so
 *      the same word can arrive composed in one segment and decomposed in the
 *      next.
 *
 * The method: take a real translated sentence, cut it into segments the way a
 * streaming recognizer does — each segment repeating the previous segment's
 * last word — and assert the original sentence comes back exactly.
 *
 *   npx tsx scripts/test-speech-transcript-dedupe-all-languages.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { joinSegments } from '../src/hooks/useSpeechRecognition';
import { SUPPORTED_LANGUAGES } from '../src/i18n/languages';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `\n        ${detail}` : ''}`);
}

/** Every string value in a nested translation object. */
function collectStrings(node: unknown, into: string[]): string[] {
  if (typeof node === 'string') into.push(node);
  else if (node && typeof node === 'object') Object.values(node).forEach((v) => collectStrings(v, into));
  return into;
}

/**
 * Loads a locale's strings. en/hi/bn are TypeScript modules; the other 20 are
 * JSON, so the JSON is parsed directly and the three modules are read through
 * the same import the app uses.
 */
async function loadStrings(code: string): Promise<string[]> {
  const jsonPath = path.join('src/i18n/locales', `${code}.json`);
  if (fs.existsSync(jsonPath)) {
    return collectStrings(JSON.parse(fs.readFileSync(jsonPath, 'utf8')), []);
  }
  const mod = await import(`../src/i18n/${code}`);
  const dict = (mod as Record<string, unknown>).default ?? mod;
  return collectStrings((dict as Record<string, unknown>).default ?? dict, []);
}

/**
 * Cuts a sentence the way a streaming recognizer does: overlapping windows, so
 * each segment re-reports the tail of the one before it. `overlap` words are
 * repeated at every seam.
 */
function segmentWithOverlap(sentence: string, wordsPerSegment: number, overlap: number): string[] {
  const words = sentence.split(/\s+/).filter(Boolean);
  const segments: string[] = [];
  let i = 0;
  while (i < words.length) {
    const end = Math.min(i + wordsPerSegment, words.length);
    segments.push(words.slice(i, end).join(' '));
    if (end === words.length) break;
    i = end - overlap;
  }
  return segments;
}

const accumulate = (segments: string[]) => segments.reduce((acc, s) => joinSegments(acc, s), '');

/**
 * Mirrors the hook's own word-comparison key. Used only to spot sentences that
 * already repeat a word back-to-back, which are held out of the bulk sweep and
 * asserted separately as the known trade-off.
 */
function overlapKeyForTest(word: string): string {
  return word
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[.,!?;:'"()।॥॰૰،؛؟۔᱾᱿꯫]/g, '')
    .toLowerCase();
}

async function main() {
  console.log('— every language, its own product text, cut into overlapping segments —\n');

  for (const lang of SUPPORTED_LANGUAGES) {
    let strings: string[];
    try {
      strings = await loadStrings(lang.code);
    } catch (err) {
      check(`${lang.code.padEnd(4)} ${lang.name}`, false, `could not load locale: ${String(err)}`);
      continue;
    }

    // Sentences long enough to have several seams, and free of interpolation
    // placeholders (which are not speech and would make the test meaningless).
    const candidates = strings
      .filter((s) => !s.includes('{') && s.split(/\s+/).filter(Boolean).length >= 8)
      .slice(0, 40);

    if (candidates.length === 0) {
      check(`${lang.code.padEnd(4)} ${lang.name}`, false, 'no sentence long enough to segment');
      continue;
    }

    let mismatches = 0;
    let firstFailure = '';
    let seams = 0;
    let skippedForKnownTradeOff = 0;

    for (const sentence of candidates) {
      const normalised = sentence.split(/\s+/).filter(Boolean).join(' ');

      // A sentence that already repeats a word back-to-back is the documented
      // trade-off, not a defect: if that repetition happens to land on a seam
      // we collapse it and lose one copy. Sindhi's date hint
      // "(DD-MM-YYYY)" spelled out as وائي وائي وائي وائي is a real example
      // from our own locale files. Counted and reported, not silently passed.
      const words = normalised.split(' ');
      if (words.some((w, i) => i > 0 && overlapKeyForTest(w) === overlapKeyForTest(words[i - 1]))) {
        skippedForKnownTradeOff++;
        continue;
      }

      // Several segment shapes, including a two-word overlap.
      for (const [size, overlap] of [[4, 1], [3, 1], [5, 2], [2, 1]] as const) {
        const segments = segmentWithOverlap(normalised, size, overlap);
        seams += Math.max(0, segments.length - 1);
        const rebuilt = accumulate(segments);
        if (rebuilt !== normalised) {
          mismatches++;
          if (!firstFailure) {
            firstFailure = `size=${size} overlap=${overlap}\n        expected: ${normalised}\n        got:      ${rebuilt}`;
          }
        }
      }
    }

    const skipNote = skippedForKnownTradeOff > 0
      ? `  (${skippedForKnownTradeOff} with a back-to-back repeated word held out — see below)`
      : '';
    check(
      `${lang.code.padEnd(4)} ${lang.name.padEnd(18)} ${String(candidates.length - skippedForKnownTradeOff).padStart(2)} sentences, ${String(seams).padStart(4)} seams${skipNote}`,
      mismatches === 0,
      firstFailure,
    );
  }

  console.log('\n— the script-specific hazards, each isolated —\n');

  // Sentence marks that are not ASCII. Each pair is the same word, punctuated
  // in one segment and bare in the next, which is exactly what the recognizer
  // does at a seam.
  const punctuationCases: Array<[string, string, string, string]> = [
    ['Hindi / danda', 'मेरे पास पचास हज़ार।', 'हज़ार रुपये हैं', 'मेरे पास पचास हज़ार। रुपये हैं'],
    ['Sanskrit / double danda', 'व्यवसायः अस्ति॥', 'अस्ति शुभम्', 'व्यवसायः अस्ति॥ शुभम्'],
    ['Urdu / Arabic full stop', 'میرے پاس پیسے ہیں۔', 'ہیں اور دکان', 'میرے پاس پیسے ہیں۔ اور دکان'],
    ['Urdu / Arabic question mark', 'کیا مجھے قرض ملے گا؟', 'گا مجھے بتائیں', 'کیا مجھے قرض ملے گا؟ مجھے بتائیں'],
    ['Sindhi / Arabic comma', 'مون وٽ پئسا آهن،', 'آهن دڪان لاءِ', 'مون وٽ پئسا آهن، دڪان لاءِ'],
    ['Santali / mucaad', 'ᱟᱢ ᱛᱟᱦᱮᱸᱱ ᱛᱟᱠᱟ᱾', 'ᱛᱟᱠᱟ ᱢᱮᱱᱟᱜ', 'ᱟᱢ ᱛᱟᱦᱮᱸᱱ ᱛᱟᱠᱟ᱾ ᱢᱮᱱᱟᱜ'],
    ['Manipuri / cheikhei', 'ꯑꯩꯒꯤ ꯁꯦꯜ ꯂꯩ꯫', 'ꯂꯩ ꯑꯗꯨ', 'ꯑꯩꯒꯤ ꯁꯦꯜ ꯂꯩ꯫ ꯑꯗꯨ'],
  ];
  for (const [name, left, right, want] of punctuationCases) {
    const got = joinSegments(left, right);
    check(name, got === want, `expected: ${want}\n        got:      ${got}`);
  }

  // A zero-width joiner present in one segment and absent in the next.
  const zwjWord = 'ಸ್ವ‌ಂತ';
  const zwjPlain = 'ಸ್ವಂತ';
  check('Kannada / zero-width non-joiner ignored when matching',
    joinSegments(`ನನ್ನ ${zwjWord}`, `${zwjPlain} ವ್ಯಾಪಾರ`) === `ನನ್ನ ${zwjWord} ವ್ಯಾಪಾರ`,
    `got: ${joinSegments(`ನನ್ನ ${zwjWord}`, `${zwjPlain} ವ್ಯಾಪಾರ`)}`);

  // The same word precomposed in one segment, decomposed in the next.
  //
  // These letters must be written as explicit code points, not built with
  // `normalize()`. Bengali ড় and Odia ଡ଼ are Unicode COMPOSITION EXCLUSIONS:
  // NFC decomposes them to base + nukta and never recomposes, so normalising
  // both forms first would yield two identical strings and assert nothing.
  // What matters for us is only that NFC maps both spellings onto the same
  // key — which it does, and which is what makes the comparison work.
  const bnPre = '\u09DC';         // U+09DC, precomposed
  const bnDec = '\u09A1\u09BC';        // U+09A1 U+09BC, base + nukta
  check('Bengali / the two spellings really are different strings',
    bnPre !== bnDec, `both were ${JSON.stringify(bnPre)}`);
  check('Bengali / precomposed vs decomposed treated as one word',
    joinSegments(`বা${bnPre}ি`, `বা${bnDec}ি ভালো`) === `বা${bnPre}ি ভালো`,
    `got: ${joinSegments(`বা${bnPre}ি`, `বা${bnDec}ি ভালো`)}`);

  const orPre = '\u0B5C';         // U+0B5C, precomposed
  const orDec = '\u0B21\u0B3C';        // U+0B21 U+0B3C, base + nukta
  check('Odia / the two spellings really are different strings',
    orPre !== orDec, `both were ${JSON.stringify(orPre)}`);
  check('Odia / precomposed vs decomposed treated as one word',
    joinSegments(`ଓ${orPre}ିଆ`, `ଓ${orDec}ିଆ ଭାଷା`) === `ଓ${orPre}ିଆ ଭାଷା`,
    `got: ${joinSegments(`ଓ${orPre}ିଆ`, `ଓ${orDec}ିଆ ଭାଷା`)}`);

  console.log('\n— the trade-off, asserted rather than hidden —\n');

  // Held out of the sweep above, and pinned here so the cost stays visible.
  // A word the speaker genuinely repeats loses one copy IF the repetition
  // lands exactly on a seam. Sindhi's spelled-out date hint is a real example
  // from our own locale files.
  check('a genuinely repeated word IS collapsed when it lands on a seam',
    joinSegments('وائي وائي', 'وائي وائي') === 'وائي وائي',
    `got: ${joinSegments('وائي وائي', 'وائي وائي')}`);
  check('but the same repetition inside ONE segment is untouched',
    joinSegments('', 'وائي وائي وائي وائي') === 'وائي وائي وائي وائي');

  console.log('\n— and what must still NOT collapse, in a non-Latin script —\n');

  check('repetition inside a single segment survives (Hindi)',
    joinSegments('', 'बहुत बहुत अच्छा है') === 'बहुत बहुत अच्छा है');
  check('repetition inside a single segment survives (Tamil)',
    joinSegments('', 'ரொம்ப ரொம்ப நல்லது') === 'ரொம்ப ரொம்ப நல்லது');
  check('unrelated segments join untouched (Telugu)',
    joinSegments('నా దగ్గర', 'యాభై వేల రూపాయలు') === 'నా దగ్గర యాభై వేల రూపాయలు');

  console.log(failed === 0
    ? '\nAll languages passed.'
    : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
