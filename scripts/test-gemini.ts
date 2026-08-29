import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { generateContent, generateContentStream, GEMINI_MODELS } from '../src/lib/gemini';

async function testGemini() {
  console.log('Testing App Gemini Client Configuration...');
  console.log(`• Primary Model   : ${GEMINI_MODELS.FLASH}`);
  console.log(`• Fallback Model  : ${GEMINI_MODELS.FLASH_LITE}\n`);

  console.log('1️⃣ Testing generateContent() with Primary Model:');
  const response = await generateContent(
    GEMINI_MODELS.FLASH,
    'You are ArthaSetu AI assistant.',
    'Confirm system status in 6 words.'
  );
  console.log(`   Response: "${response.trim()}"\n`);

  console.log('2️⃣ Testing generateContentStream() with Primary Model:');
  const stream = generateContentStream(
    GEMINI_MODELS.FLASH,
    'You are ArthaSetu AI assistant.',
    'Give a 2-sentence encouraging tip for a rural entrepreneur.'
  );
  process.stdout.write('   Stream: "');
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
  console.log('"\n');

  console.log('3️⃣ Testing Fallback Model (FLASH_LITE):');
  const fallbackResponse = await generateContent(
    GEMINI_MODELS.FLASH_LITE,
    'You are ArthaSetu AI assistant.',
    'Confirm fallback model is ready in 4 words.'
  );
  console.log(`   Fallback Response: "${fallbackResponse.trim()}"\n`);

  console.log('🎉 ALL GEMINI INTEGRATION TESTS PASSED!');
}

testGemini().catch((err) => {
  console.error('❌ Gemini test failed:', err);
  process.exit(1);
});
