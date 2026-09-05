import { config } from 'dotenv';
config({ path: '.env.local' });
import { generateAgentStream, GEMINI_MODELS } from '../src/lib/gemini';

const toolHandler = async (name: string, args: any) => {
  if (name === 'calculateFinancials') {
    return {
      monthlyGrossRevenue: 10000,
      totalInitialCost: 50000,
      emi: 1500,
      fundingGap: 10000
    };
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
      }
    ]
  }
];

async function main() {
  const stream = generateAgentStream(
    GEMINI_MODELS.FLASH,
    "You are a helpful business advisor.",
    "আমার কাছে পাওয়া 50000 আছে, কি করব? I want to start a tea stall. Run calculateFinancials for tea stall.",
    tools,
    toolHandler,
    { temperature: 0.1 }
  );

  try {
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
  } catch (err) {
    console.error("\nERROR:", err);
  }
}

main();
