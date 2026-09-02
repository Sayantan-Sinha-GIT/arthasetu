/**
 * Verifies the advisor's agentic tool loop survives Gemini being exhausted.
 *
 * The Gemini key is poisoned before the module is imported — the client is a
 * singleton that captures it at construction, so mutating process.env mid-run
 * would change nothing and the test would pass while Gemini quietly answered.
 *
 *   npx tsx scripts/test-advisor-failover.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const env = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
process.env.GEMINI_API_KEY = 'invalid-key-forcing-provider-failover';

let sawGroq = false;
const realWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (String(args[0] ?? '').includes('Failing over the advisor to Groq')) sawGroq = true;
  realWarn(...args);
};

const calledTools: string[] = [];

(async () => {
  const { generateAgentStream, GEMINI_MODELS } = await import('../src/lib/gemini');
  const { Type } = await import('@google/genai');

  const tools = [
    {
      functionDeclarations: [
        {
          name: 'calculateFinancials',
          description:
            'Calculates project viability, funding gap and loan EMI deterministically. Call this whenever the user asks whether a business idea is viable.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              businessType: { type: Type.STRING, description: 'Type of business' },
              equipmentCost: { type: Type.NUMBER, description: 'Equipment cost in INR' },
              availableSavings: { type: Type.NUMBER, description: 'Savings in INR' },
            },
          },
        },
      ],
    },
  ];

  // Stands in for the real deterministic engine: the point is that the model
  // asks for it and then explains the numbers it is handed.
  const toolHandler = async (name: string, args: Record<string, unknown>) => {
    calledTools.push(name);
    console.log(`  tool called: ${name}(${JSON.stringify(args).slice(0, 90)})`);
    return { totalProjectCost: 120000, fundingGap: 40000, monthlyEmi: 1450, viable: true };
  };

  const history = [
    {
      role: 'user',
      parts: [
        {
          text: 'I have 80000 rupees savings and want to start a poultry farm needing 120000 for equipment. Is it viable? Answer briefly in English.',
        },
      ],
    },
  ];

  console.log('scenario: Gemini broken, advisor must complete on Groq\n');
  let output = '';
  try {
    for await (const chunk of generateAgentStream(
      GEMINI_MODELS.FLASH,
      'You are ArthaSetu, an advisor for Indian rural micro-entrepreneurs. Use the tools for any numbers. Never invent figures.',
      history,
      tools,
      toolHandler
    )) {
      output += chunk;
    }
  } catch (e) {
    console.log('ERROR ->', e instanceof Error ? e.message.slice(0, 140) : e);
  }

  console.log('\nvia Groq        :', sawGroq);
  console.log('tools executed  :', calledTools.length ? calledTools.join(', ') : '(none)');
  console.log('answer          :', output.trim().slice(0, 180) || '(empty)');
  const pass = sawGroq && calledTools.includes('calculateFinancials') && output.trim().length > 0;
  console.log('\n' + (pass ? 'PASS' : 'FAIL'));
})();
