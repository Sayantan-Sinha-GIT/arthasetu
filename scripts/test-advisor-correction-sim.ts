/**
 * Live multi-turn advisor test: verifies that when a user provides a corrected value
 * for an already-known profile field, the advisor calls `updateProfile` with the
 * new figure rather than ignoring it.
 *
 *   npx tsx scripts/test-advisor-correction-sim.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const envFile = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

async function testCorrectionLive() {
  const { generateAgentStream, GEMINI_MODELS } = await import('../src/lib/gemini');
  const { Type } = await import('@google/genai');
  const { buildAdvisorSystemPrompt } = await import('../src/lib/prompts/advisor');

  const tools = [
    {
      functionDeclarations: [
        {
          name: 'updateProfile',
          description:
            'Saves details the user reveals about themselves or their business, whether volunteered or given in answer to your question. Call this immediately after they tell you something, so the profile fills in as the conversation goes and they are never asked twice. This includes corrections — if the user changes a value they already gave you earlier in the conversation (or that was already on their profile), call this again with the new value. Never continue using an old value after the user has told you it changed. Pass only the fields they actually gave you.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              businessType: { type: Type.STRING },
              availableCapital: { type: Type.NUMBER },
              state: { type: Type.STRING },
              district: { type: Type.STRING },
            },
          },
        },
      ],
    },
  ];

  // User profile already has availableCapital = 25000 (complete for this field)
  const profile: any = {
    uid: 'u1',
    name: 'Ramesh Kumar',
    state: 'Assam',
    district: 'Nagaon',
    locality: 'Dhing',
    businessType: 'Tea Stall',
    businessStatus: 'planning',
    businessCategory: 'Retail',
    businessExperience: '1-3 years',
    availableCapital: 25000,
    desiredFunding: 50000,
    dob: '1990-01-01',
    existingLoans: false,
  };

  const systemPrompt = buildAdvisorSystemPrompt(profile, 'en');

  // Multi-turn conversation:
  // Turn 1: User mentions 25000
  // Turn 2: Advisor replies
  // Turn 3: User states a correction to ₹60,000
  const history: any[] = [
    {
      role: 'user',
      parts: [{ text: 'I am planning to start a tea stall in Nagaon with my 25000 savings.' }],
    },
    {
      role: 'model',
      parts: [{ text: 'A tea stall in Nagaon is a great initiative with ₹25,000. Let us discuss the setup steps.' }],
    },
    {
      role: 'user',
      parts: [{ text: 'Actually I have more saved now, it is more like ₹60,000. Please update my capital and advise me based on 60000.' }],
    },
  ];

  let calledWith: any = null;
  const toolHandler = async (name: string, args: Record<string, unknown>) => {
    console.log(`Tool called: ${name}(${JSON.stringify(args)})`);
    if (name === 'updateProfile') {
      calledWith = args;
      return { success: true, updated: args };
    }
    return {};
  };

  let output = '';
  try {
    for await (const chunk of generateAgentStream(
      GEMINI_MODELS.FLASH,
      systemPrompt,
      history,
      tools,
      toolHandler
    )) {
      output += chunk;
    }
  } catch (err: any) {
    console.log('Stream note:', err?.message?.slice(0, 120) || err);
  }

  const capital = Number(calledWith?.availableCapital);
  const pass = calledWith !== null && capital === 60000;

  console.log('\n--- Correction Scenario Results ---');
  console.log('updateProfile tool invoked:', calledWith !== null);
  console.log('Captured availableCapital  :', capital);
  console.log('Advisor response excerpt   :', output.trim().slice(0, 160) || '(none)');
  console.log('\n' + (pass ? 'PASS' : 'FAIL'));

  if (!pass) {
    process.exit(1);
  }
}

testCorrectionLive();
