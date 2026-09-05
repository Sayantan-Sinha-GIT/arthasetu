// verify-sdk-migration.ts
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { generateContent, generateContentStream, generateAgentStream, GEMINI_MODELS } from '@/lib/gemini';

function logEnv() {
  console.log('GEMINI_API_KEY present?', !!process.env.GEMINI_API_KEY);
}

async function testGenerateContent() {
  console.log('Testing generateContent...');
  logEnv();
  const result = await generateContent(
    GEMINI_MODELS.FLASH,
    'You are a helpful assistant.',
    'Say hello in Hindi.',
    { temperature: 0.0, maxOutputTokens: 20, disableFallback: true }
  );
  console.log('generateContent result:', result);
}

async function testGenerateContentStream() {
  console.log('Testing generateContentStream...');
  logEnv();
  const stream = generateContentStream(
    GEMINI_MODELS.FLASH,
    'You are a helpful assistant.',
    'List three Indian government schemes for small businesses.',
    { temperature: 0.0, maxOutputTokens: 100, disableFallback: true }
  );
  let collected = '';
  for await (const chunk of stream) {
    collected += chunk;
  }
  console.log('generateContentStream collected:', collected);
}

async function testGenerateAgentStream() {
  console.log('Testing generateAgentStream...');
  logEnv();
  const dummyTools = [];
  const dummyHandler = async (name: string, args: any) => ({ error: 'No tools defined' });
  const systemInstruction = 'You are a helpful assistant.';
  const userMessage = 'Provide a short greeting.'
  const stream = generateAgentStream(
    GEMINI_MODELS.FLASH,
    systemInstruction,
    userMessage,
    dummyTools,
    dummyHandler,
    { temperature: 0.0, maxOutputTokens: 50, disableFallback: true }
  );
  let out = '';
  for await (const chunk of stream) {
    out += chunk;
  }
  console.log('generateAgentStream output:', out);
}

async function main() {
  try {
    await testGenerateContent();
    await testGenerateContentStream();
    await testGenerateAgentStream();
    console.log('All SDK verification tests passed.');
  } catch (e) {
    console.error('SDK verification failed:', e);
    process.exit(1);
  }
}

main();
