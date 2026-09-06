/**
 * Guards against the recognizer's segment-boundary doubling.
 *
 * What went wrong: Chrome's streaming recognizer overlaps its decode windows,
 * so consecutive results re-report the last word or two of the one before.
 * Concatenating them naively doubled words in front of the user — a Bengali
 * speaker saying "আমার কাছে ৫০০০০ টাকা আছে" got back
 * "আমার আমার কাছে ৫০০০০ টাকা টাকা আছে". Worst in the Indic locales, whose
 * weaker acoustic models emit shorter, burstier segments and so more boundaries.
 *
 * `joinSegments` now collapses the overlap. These cases are the real transcript
 * from the reported defect plus the boundaries that must NOT be collapsed.
 *
 *   npx tsx scripts/test-speech-transcript-dedupe.ts
 */
import { joinSegments } from '../src/hooks/useSpeechRecognition';

let failed = 0;
function check(name: string, got: string, want: string) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        expected: ${want}\n        got:      ${got}`);
}

/** Folds a run of recognizer segments the way the hook accumulates them. */
function accumulate(segments: string[]): string {
  return segments.reduce((acc, seg) => joinSegments(acc, seg), '');
}

console.log('— the reported defect —');

// Exactly what the recognizer emitted on the screenshot that reported this.
check('Bengali capital statement, tail-of-segment repeated as head of the next',
  accumulate(['আমার', 'আমার কাছে ৫০০০০ টাকা', 'টাকা আছে']),
  'আমার কাছে ৫০০০০ টাকা আছে');

console.log('\n— overlaps of every shape —');

check('single repeated word at the boundary',
  joinSegments('मेरे पास', 'पास पचास हज़ार हैं'),
  'मेरे पास पचास हज़ार हैं');
check('repeated phrase, not just one word',
  joinSegments('I want to start a poultry', 'a poultry farm in Assam'),
  'I want to start a poultry farm in Assam');
check('segment fully contained in what we already have',
  joinSegments('আমার কাছে টাকা আছে', 'টাকা আছে'),
  'আমার কাছে টাকা আছে');
check('an exact duplicate segment collapses to one',
  joinSegments('ਮੇਰੇ ਕੋਲ ਪੈਸੇ ਹਨ', 'ਮੇਰੇ ਕੋਲ ਪੈਸੇ ਹਨ'),
  'ਮੇਰੇ ਕੋਲ ਪੈਸੇ ਹਨ');
check('overlap is matched past inconsistent punctuation',
  joinSegments('I have fifty thousand rupees.', 'Rupees saved up'),
  'I have fifty thousand rupees. saved up');
check('overlap is matched past inconsistent casing',
  joinSegments('my budget is Fifty', 'fifty thousand'),
  'my budget is Fifty thousand');

console.log('\n— what must NOT be collapsed —');

check('unrelated segments join untouched',
  joinSegments('আমার কাছে', 'পঞ্চাশ হাজার টাকা'),
  'আমার কাছে পঞ্চাশ হাজার টাকা');
check('repetition INSIDE one segment is left exactly as spoken',
  joinSegments('', 'बहुत बहुत अच्छा है'),
  'बहुत बहुत अच्छा है');
check('a word repeated only near, not at, the boundary is kept',
  joinSegments('टाका कम है', 'मुझे टाका चाहिए'),
  'टाका कम है मुझे टाका चाहिए');
check('empty left side',
  joinSegments('', 'हैलो'),
  'हैलो');
check('empty right side',
  joinSegments('हैलो', ''),
  'हैलो');
check('whitespace is normalised at the seam',
  joinSegments('  আমার  ', '  ভালো  '),
  'আমার ভালো');

console.log('\n— a long dictation across many browser-dropped sessions —');

check('eight overlapping segments reassemble into one clean sentence',
  accumulate([
    'मैं एक',
    'एक सिलाई की',
    'की दुकान खोलना',
    'खोलना चाहती हूँ',
    'चाहती हूँ मेरे पास',
    'मेरे पास पचास हज़ार',
    'पचास हज़ार रुपये',
    'रुपये हैं',
  ]),
  'मैं एक सिलाई की दुकान खोलना चाहती हूँ मेरे पास पचास हज़ार रुपये हैं');

console.log(failed === 0 ? '\nAll transcript de-duplication checks passed.' : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
