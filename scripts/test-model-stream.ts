import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { GoogleGenerativeAI } from '@google/generative-ai';

async function testStream() {
  const apiKey = process.env.GEMINI_API_KEY!;
  const client = new GoogleGenerativeAI(apiKey);

  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.6-flash'];
  for (const m of models) {
    const start = Date.now();
    try {
      console.log(`Testing stream with ${m}...`);
      const model = client.getGenerativeModel({
        model: m,
        systemInstruction: 'You are a helpful business assistant.',
      });
      const streamRes = await model.generateContentStream('Say hello in 5 words.');
      let out = '';
      for await (const chunk of streamRes.stream) {
        out += chunk.text();
      }
      console.log(`✅ ${m} took ${Date.now() - start}ms: "${out.trim()}"`);
    } catch (e: any) {
      console.log(`❌ ${m} error:`, e?.message);
    }
  }
}

testStream().catch(console.error);
