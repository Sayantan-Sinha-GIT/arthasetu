import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No API key in .env.local');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (!data.models) {
    console.log('Response:', data);
    return;
  }

  console.log(`========================================================================================`);
  console.log(`GOOGLE GEMINI API - ALL AVAILABLE MODELS (${data.models.length} total)`);
  console.log(`========================================================================================\n`);

  console.log('--- ALL GENERATIVE MODELS (support generateContent) ---');
  const genModels = data.models.filter((m: any) => 
    m.supportedGenerationMethods?.includes('generateContent')
  );

  genModels.forEach((m: any, idx: number) => {
    const id = m.name.replace('models/', '');
    console.log(`[${idx + 1}] ${id}`);
    console.log(`    Display Name : ${m.displayName}`);
    console.log(`    Version      : ${m.version}`);
    console.log(`    Input Limit  : ${m.inputTokenLimit?.toLocaleString()} tokens`);
    console.log(`    Output Limit : ${m.outputTokenLimit?.toLocaleString()} tokens`);
    console.log(`    Thinking     : ${m.thinking ? 'Yes' : 'No'}`);
    console.log('');
  });

  console.log('\n--- SPECIALIZED / AUDIO / EMBEDDING / VIDEO MODELS ---');
  const otherModels = data.models
    .filter((m: any) => !m.supportedGenerationMethods?.includes('generateContent'))
    .map((m: any) => ({
      'Model ID': m.name.replace('models/', ''),
      'Display Name': m.displayName,
      'Methods': m.supportedGenerationMethods?.join(', ')
    }));

  console.table(otherModels);
}

listModels().catch(console.error);
