/**
 * Verifies the Groq fallback actually runs.
 *
 * The Gemini client is a singleton that captures the API key when it is first
 * constructed, so mutating process.env mid-run does nothing — an earlier
 * version of this test "passed" while Gemini quietly answered every call. The
 * key is therefore poisoned before the module is ever imported, in a fresh
 * process, which forces both Gemini tiers to fail for real.
 *
 * Usage:
 *   npx tsx scripts/_failover.ts          -> Gemini broken, expect Groq
 *   npx tsx scripts/_failover.ts --nogroq -> both broken, expect a clean error
 */
import * as fs from 'fs';
import * as path from 'path';

const env = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

// Poisoned before any import of the Gemini module below.
process.env.GEMINI_API_KEY = 'invalid-key-forcing-provider-failover';
if (process.argv.includes('--nogroq')) delete process.env.GROQ_API_KEY;

const SYSTEM =
  'You are a financial advisor for rural Indian micro-entrepreneurs. Answer in one short sentence, in Bengali.';
const USER = 'Tell the entrepreneur their business plan is ready.';

let sawGroqFailover = false;
const realWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (String(args[0] ?? '').includes('Failing over to Groq')) sawGroqFailover = true;
  realWarn(...args);
};

(async () => {
  const { generateContent, GEMINI_MODELS } = await import('../src/lib/gemini');
  const expectGroq = !process.argv.includes('--nogroq');

  console.log(`\nscenario: Gemini broken, Groq ${expectGroq ? 'available' : 'also removed'}`);
  try {
    const out = await generateContent(GEMINI_MODELS.FLASH, SYSTEM, USER);
    console.log('RESULT   : answered ->', out.trim().slice(0, 80));
    console.log('via Groq :', sawGroqFailover);
    console.log(expectGroq && sawGroqFailover ? 'PASS' : 'FAIL (expected the Groq path)');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log('RESULT   : errored ->', msg.slice(0, 110));
    console.log('via Groq :', sawGroqFailover);
    console.log(!expectGroq ? 'PASS (clean failure with no provider left)' : 'FAIL');
  }
})();
