import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGenerate() {
  const apiKey = process.env.GEMINI_API_KEY!;
  const client = new GoogleGenerativeAI(apiKey);

  const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
  for (const m of models) {
    const start = Date.now();
    try {
      console.log(`Testing generateContent with ${m}...`);
      const model = client.getGenerativeModel({
        model: m,
        systemInstruction: 'You are a helpful business assistant.',
      });
      const res = await model.generateContent('Say hello in 5 words.');
      console.log(`✅ ${m} took ${Date.now() - start}ms: "${res.response.text().trim()}"`);
    } catch (e: any) {
      console.log(`❌ ${m} error:`, e?.message);
    }
  }
}

testGenerate().catch(console.error);
