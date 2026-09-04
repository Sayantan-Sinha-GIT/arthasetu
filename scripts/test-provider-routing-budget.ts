/**
 * Guards the routing decisions that keep the advisor answering on free tiers.
 *
 * The advisor "worked sometimes". Four separate faults combined to produce
 * that, all of them about spending a fixed time budget badly:
 *
 *  1. A 429 was retried like a transient error. Gemini's free tier allows 20
 *     requests per day per model, so the quota does not come back in four
 *     seconds — every retry re-confirmed the same exhaustion. Worse, the retry
 *     ladder sits in front of the provider failover, so the request spent its
 *     whole budget proving Gemini was unavailable and was killed by the 60s
 *     serverless ceiling before Groq, which was configured and idle, was asked.
 *  2. On a rate limit the second Gemini model was tried anyway, though both
 *     draw on the same project quota, so it could only fail too.
 *  3. Nothing bounded how long Gemini could produce silence. Measured latency
 *     was 40s to 120s against that 60s ceiling.
 *  4. The scope classifier — an off-topic guard — shared the main chain, so its
 *     retries and slow model were charged to every reply before any text
 *     appeared. It was the single largest cost in the request.
 *
 * And once traffic did reach Groq, the advisor's tool loop was pinned to one
 * model while the second sat unused with its own separate token budget.
 *
 * Measured on localhost against the real providers: 40-120s and failing,
 * before; 2-6s and a burst of six consecutive questions all answered, after.
 *
 *   npx tsx scripts/test-provider-routing-budget.ts
 */
import * as fs from 'fs';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`);
}

const gemini = fs.readFileSync('src/lib/gemini.ts', 'utf8');
const groq = fs.readFileSync('src/lib/groq.ts', 'utf8');

console.log('— a rate limit is not a transient error —');

check('rate limits and transient failures are told apart',
  /function isRateLimitError/.test(gemini) && /function isTransientError/.test(gemini),
  'one predicate for both is what made 429s get retried');
check('a rate limit is never retried',
  /if \(isRateLimitError\(error\)\)[\s\S]{0,200}?throw error;/.test(gemini),
  'retrying a spent daily quota burns the budget the fallback provider needs');
check('only genuine unavailability is retried',
  /if \(isTransientError\(error\) && attempt < retries\)/.test(gemini));
check('429 is not in the retryable predicate',
  !/isTransientError[\s\S]{0,400}?429/.test(gemini));

console.log('\n— the failover skips providers that cannot help —');

check('a rate limit is remembered',
  /function noteGeminiRateLimited/.test(gemini) && /isGeminiCoolingOff/.test(gemini),
  'without this every request pays the discovery cost again');
check('the cool-off routes straight to the other provider',
  /isGeminiCoolingOff\(\)[\s\S]{0,160}?isGroqConfigured\(\)/.test(gemini));
check('the sibling Gemini model is skipped on a rate limit',
  (gemini.match(/!isRateLimitError\(primaryError\)/g) || []).length >= 2,
  'both models share one project quota, so the sibling can only fail too');

console.log('\n— nothing may run out the serverless clock —');

const firstToken = /FIRST_TOKEN_TIMEOUT_MS\s*=\s*(\d+)/.exec(gemini);
check('time-to-first-token is bounded', !!firstToken);
if (firstToken) {
  const ms = Number(firstToken[1]);
  // Must leave room inside the 60s function ceiling for the fallback provider
  // to actually produce and stream a full answer.
  check(`the bound (${ms}ms) leaves room for a fallback answer`, ms > 0 && ms <= 30000,
    'a bound close to the 60s ceiling cannot be recovered from');
}
check('only the FIRST token is bounded',
  /awaitingFirst/.test(gemini),
  'switching providers mid-answer would splice two different replies together');
check('an abandoned stream is closed',
  /iterator\.return\?\.\(/.test(gemini));
check('a slow model does not fall through to its equally slow sibling',
  /!isFirstTokenTimeout\(primaryError\)/.test(gemini));

console.log('\n— the off-topic guard cannot delay a real answer —');

check('the classifier has a hard ceiling',
  /CLASSIFIER_TIMEOUT_MS/.test(gemini));
check('the classifier fails open',
  /catch[\s\S]{0,220}?return 'ON_TOPIC'/.test(gemini),
  'a guard that blocks on failure would deny service on any provider hiccup');
check('the classifier prefers the fast provider',
  /const classifyOnce[\s\S]{0,600}?isGroqConfigured\(\)[\s\S]{0,600}?groqGenerateContent/.test(gemini),
  'a ten-token yes/no question does not need the strongest model, it needs the quickest');
check('ambiguity resolves to ON_TOPIC',
  /When in doubt, answer "ON_TOPIC"/.test(gemini),
  'our users ask short, imprecise questions; turning one away is the worse error');

console.log('\n— Groq uses all the capacity it has —');

check('the agent loop tries every Groq model',
  /for \(const model of GROQ_MODELS\)/.test(groq) && /runGroqAgent/.test(groq),
  'pinning to GROQ_MODELS[0] left the second model idle with its own token budget');
check('models are only switched before any text is shown',
  /if \(yieldedText\) throw err;/.test(groq));
check('each attempt starts from the original conversation',
  /baseMessages\.map\(/.test(groq),
  'replaying a failed run\'s half-finished turns into another model corrupts the exchange');
check('a rolling token limit is waited out, briefly',
  /TPM_RETRY_DELAYS_MS/.test(groq),
  'Groq meters per minute, so unlike a daily cap a short wait genuinely clears it');

const delays = /TPM_RETRY_DELAYS_MS\s*=\s*\[([^\]]*)\]/.exec(groq);
check('the wait is bounded well inside the function ceiling', !!delays);
if (delays) {
  const total = delays[1].split(',').map((n) => Number(n.trim())).reduce((a, b) => a + b, 0);
  check(`total added wait (${total}ms) stays under 15s`, total > 0 && total <= 15000,
    'waiting longer trades a visible error for an invisible timeout, which is worse');
}

console.log(`\n${failed === 0 ? 'All provider routing assertions passed.' : `${failed} assertion(s) FAILED.`}`);
process.exit(failed === 0 ? 0 : 1);
