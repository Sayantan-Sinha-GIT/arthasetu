import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { GoogleGenerativeAI } from '@google/generative-ai';

async function testStream35() {
  const apiKey = process.env.GEMINI_API_KEY!;
  const client = new GoogleGenerativeAI(apiKey);

  const start = Date.now();
  console.log('Testing generateContentStream with gemini-3.5-flash...');
  const model = client.getGenerativeModel({
    model: 'gemini-3.5-flash',
    systemInstruction: 'You are ArthaSetu, an AI business advisor.',
  });
  const res = await model.generateContentStream('Give 3 tips for starting a poultry farm in Assam.');
  let out = '';
  for await (const chunk of res.stream) {
    out += chunk.text();
  }
  console.log(`✅ gemini-3.5-flash stream finished in ${Date.now() - start}ms! Output length: ${out.length} chars`);
  console.log('Preview:\n', out.slice(0, 300));
}

testStream35().catch(console.error);
