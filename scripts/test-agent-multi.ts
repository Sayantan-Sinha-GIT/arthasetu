import { config } from 'dotenv';
config({ path: '.env.local' });
import { generateAgentStream, GEMINI_MODELS } from '../src/lib/gemini';
import * as fs from 'fs';

const toolHandler = async (name: string, args: any) => {
  fs.appendFileSync('test-results.md', `\n> [TOOL CALL EXECUTED]: ${name}(${JSON.stringify(args)})\n`);
  if (name === 'calculateFinancials') {
    return {
      monthlyGrossRevenue: 10000,
      totalInitialCost: 50000,
      emi: 1500,
      fundingGap: 10000
    };
  }
  if (name === 'saveGeneratedPlan') {
    return { success: true, planId: 'plan_123', message: 'Plan saved successfully' };
  }
  return { error: 'unknown tool' };
};

const tools = [
  {
    functionDeclarations: [
      {
        name: 'calculateFinancials',
        description: 'Calculates project viability, funding gap, and loan EMI deterministically based on business inputs.',
        parameters: {
          type: 'OBJECT',
          properties: {
            businessType: { type: 'STRING' },
            setupCost: { type: 'NUMBER' },
          }
        }
      },
      {
        name: 'saveGeneratedPlan',
        description: 'Saves a completed business plan.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
          }
        }
      }
    ]
  }
];

async function runTurn(history: any[], message: string) {
  fs.appendFileSync('test-results.md', `\n## TURN: ${message}\n\n**Assistant:** `);
  history.push({ role: 'user', parts: [{ text: message }] });
  
  const stream = generateAgentStream(
    GEMINI_MODELS.FLASH,
    "You are a helpful business advisor.",
    history,
    tools,
    toolHandler,
    { temperature: 0.1 }
  );

  let fullResponse = "";
  try {
    for await (const chunk of stream) {
      fs.appendFileSync('test-results.md', chunk);
      fullResponse += chunk;
    }
  } catch (err) {
    fs.appendFileSync('test-results.md', `\nERROR: ${err}\n`);
  }
  fs.appendFileSync('test-results.md', `\n`);
  history.push({ role: 'model', parts: [{ text: fullResponse }] });
}

async function main() {
  fs.writeFileSync('test-results.md', '# Test Results\n');
  const history: any[] = [];
  
  await runTurn(history, "Hello, what can you help me with?"); // Task 4.1
  
  const history2: any[] = [];
  await runTurn(history2, "I want to start a tea stall with ₹50,000, help me plan it"); // Task 4.2
  
  const history3: any[] = [];
  await runTurn(history3, "আমার কাছে পাওয়া 50000 আছে, কি করব? I want to start a tea stall. Please calculate financials."); // Task 4.3
  await runTurn(history3, "Can you expand on the marketing plan?"); // Task 4.4
  await runTurn(history3, "Yes, please save this plan for me. The title is 'My Tea Stall'."); // Task 4.5
}

main();
