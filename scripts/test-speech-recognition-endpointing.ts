/**
 * Guards the dictation endpointer against the regression that made voice input
 * unusable in every Indic language.
 *
 * What went wrong: `recognition.continuous = false` handed end-of-utterance
 * detection to Chrome, whose endpointer closes the session at the first pause.
 * A speaker composing a sentence aloud — the normal case for the rural
 * micro-entrepreneurs this is built for — was cut off mid-thought, and nothing
 * reopened the stream. Three things made it worse: `onend` never restarted,
 * `onResult` fired the first fragment straight into the chat as if it were the
 * whole message, and a `no-speech` event (which a pausing speaker triggers
 * constantly) tore the session down and raised an error toast.
 *
 * The behaviour of the rewritten state machine was verified end to end by
 * mounting the real hook against a fake `SpeechRecognition` in the browser and
 * driving it through pauses, spontaneous session drops, `no-speech` storms and
 * unsupported locales. What is asserted here is the set of source-level
 * invariants that, if any one of them is quietly reverted, silently restores
 * the original defect.
 *
 *   npx tsx scripts/test-speech-recognition-endpointing.ts
 */
import * as fs from 'fs';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`);
}

const hook = fs.readFileSync('src/hooks/useSpeechRecognition.ts', 'utf8');
const chat = fs.readFileSync('src/components/advisor/ChatInterface.tsx', 'utf8');

console.log('— the session stays open across pauses —');

check('recognition runs in continuous mode',
  /recognition\.continuous\s*=\s*true/.test(hook),
  'continuous=false lets Chrome end the session at the first pause');
check('no code path sets continuous back to false',
  !/recognition\.continuous\s*=\s*false/.test(hook));
check('interim results are still requested',
  /recognition\.interimResults\s*=\s*true/.test(hook),
  'without interim results the silence timer never sees speech in progress');
check('the browser ending a session triggers a restart',
  /onend\s*=\s*\(\)\s*=>\s*\{[\s\S]*?beginSessionRef\.current\(\)/.test(hook),
  'Chrome ends sessions on its own; without a restart the dictation dies');

console.log('\n— we do our own end-of-utterance detection —');

const silenceDefault = /SILENCE_COMMIT_MS_DEFAULT\s*=\s*(\d+)/.exec(hook);
const silenceEnglish = /SILENCE_COMMIT_MS_ENGLISH\s*=\s*(\d+)/.exec(hook);
check('a silence window is defined for non-English', !!silenceDefault);
check('a silence window is defined for English', !!silenceEnglish);
if (silenceDefault && silenceEnglish) {
  const dflt = Number(silenceDefault[1]);
  const eng = Number(silenceEnglish[1]);
  // The number that matters. Chrome's own endpointer fires well under two
  // seconds; anything in that range reintroduces the bug under a new name.
  check(`non-English window (${dflt}ms) is patient enough for a think-pause`, dflt >= 4000,
    'shorter than ~4s cuts off a speaker composing a sentence aloud');
  check(`English window (${eng}ms) is patient enough`, eng >= 3000);
  check('Indic locales get at least as long as English', dflt >= eng,
    'Chrome\'s Indic models return partials later and in burstier clumps');
}
check('the silence timer is re-armed on every result',
  /onresult[\s\S]*?armSilenceTimer\(\)/.test(hook),
  'a timer armed once would commit mid-sentence');
check('there is a hard ceiling on one dictation',
  /MAX_SESSION_MS/.test(hook));

console.log('\n— a partial utterance is never submitted —');

check('finalised speech accumulates in a buffer',
  /finalRef\.current\s*=\s*joinSegments\(finalRef\.current/.test(hook),
  'delivering each final segment separately sends half-sentences to the advisor');
check('the buffer is delivered through a single exit point',
  (hook.match(/onResultRef\.current\?\.\(/g) || []).length === 1,
  'multiple delivery sites are how the same text gets sent twice');
check('"Done speaking" delivers rather than discards',
  /const stopListening[\s\S]*?finish\(true\)/.test(hook));
check('"Cancel" discards rather than delivers',
  /const abortListening[\s\S]*?finish\(false\)/.test(hook));
check('un-finalised words survive "Done speaking"',
  /joinSegments\(finalRef\.current,\s*interimRef\.current\)/.test(hook),
  'committing only finalised text loses the last thing the user said');

console.log('\n— routine mid-dictation events are not failures —');

check('no-speech does not tear the session down',
  !/event\.error\s*===\s*['"]no-speech['"][\s\S]{0,200}?finish\(false\)/.test(hook),
  'a pausing speaker fires no-speech constantly');
check('permission denial is still fatal',
  /not-allowed[\s\S]{0,300}?setIsPermissionDenied\(true\)/.test(hook));
check('a barren restart loop is capped',
  /MAX_BARREN_RESTARTS/.test(hook),
  'without a cap an unusable locale spins forever');

console.log('\n— an unsupported locale falls back within its script —');

check('language-not-supported is handled',
  /language-not-supported/.test(hook),
  'unhandled, Chrome falls back to English and transcribes confident nonsense');
check('a fallback chain exists', /STT_FALLBACKS/.test(hook));
const fallbackBlock = /const STT_FALLBACKS[\s\S]*?\n\};/.exec(hook)?.[0] ?? '';
for (const [lang, expected] of [['as', 'bn-IN'], ['or', 'bn-IN'], ['kok', 'mr-IN'], ['sa', 'hi-IN']]) {
  check(`${lang} falls back to ${expected} first`,
    new RegExp(`${lang}:\\s*\\['${expected}'`).test(fallbackBlock));
}
check('no fallback chain routes an Indian language to English',
  !/en-(IN|US|GB)/.test(fallbackBlock),
  'an English recognizer on Indic speech returns fluent nonsense, not an error');

console.log('\n— the chat still drives it correctly —');

check('dictation is started with the UI speech language',
  /startListening\(speechLanguage\)/.test(chat));
check('the advisor sends the transcript only once it is complete',
  /onResult:\s*\(finalTranscript\)/.test(chat));

console.log(`\n${failed === 0 ? 'All dictation endpointing assertions passed.' : `${failed} assertion(s) FAILED.`}`);
process.exit(failed === 0 ? 0 : 1);
