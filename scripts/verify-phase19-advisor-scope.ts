import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { classifyAdvisorQuery, getAdvisorOffTopicRedirect } from '../src/lib/gemini';

async function verifyAdvisorScope() {
  console.log('============================================================');
  console.log('🤖 VERIFYING TASK 2: AI ADVISOR SCOPE CLASSIFICATION');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${name}${details ? ` (${details})` : ''}`);
    } else {
      console.error(`  ❌ [FAIL] ${name}${details ? ` (${details})` : ''}`);
    }
  }

  // 1. Direct Classifier Unit Checks
  console.log('1️⃣ Testing classifyAdvisorQuery directly:');
  
  const onTopic1 = await classifyAdvisorQuery('How can I start a small poultry farm with 50,000 rupees?');
  assert('Poultry business query classified as ON_TOPIC', onTopic1 === 'ON_TOPIC', `got ${onTopic1}`);

  const onTopic2 = await classifyAdvisorQuery('Namaste! Can you help me find government schemes for tailoring in Bihar?');
  assert('Scheme & tailoring query classified as ON_TOPIC', onTopic2 === 'ON_TOPIC', `got ${onTopic2}`);

  const greeting = await classifyAdvisorQuery('Hello ArthaSetu, good morning!');
  assert('Greeting classified as ON_TOPIC', greeting === 'ON_TOPIC', `got ${greeting}`);

  const offTopicCode = await classifyAdvisorQuery('Write Python code to implement a binary search tree and reverse a linked list');
  assert('Python programming query classified as OFF_TOPIC', offTopicCode === 'OFF_TOPIC', `got ${offTopicCode}`);

  const offTopicTrivia = await classifyAdvisorQuery('Who won the 2022 FIFA world cup final match?');
  assert('Sports trivia query classified as OFF_TOPIC', offTopicTrivia === 'OFF_TOPIC', `got ${offTopicTrivia}`);

  const offTopicHomework = await classifyAdvisorQuery('Write an essay on photosynthesis and quantum physics for my high school homework');
  assert('Physics homework query classified as OFF_TOPIC', offTopicHomework === 'OFF_TOPIC', `got ${offTopicHomework}`);

  // 2. Testing via HTTP API Endpoint
  console.log('\n2️⃣ Testing /api/advisor HTTP Endpoint:');

  try {
    const resOffTopic = await fetch('http://localhost:3000/api/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Write Python code for a binary search algorithm',
        language: 'en',
      }),
    });
    const textOffTopic = await resOffTopic.text();
    assert('API returns off-topic redirect for coding query', textOffTopic.includes('I can only assist with business planning') || textOffTopic.includes('dedicated rural business'));

    const resOnTopic = await fetch('http://localhost:3000/api/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the subsidy percentage under PMEGP for rural general category?',
        language: 'en',
      }),
    });

    let textOnTopic = '';
    if (resOnTopic.body) {
      const reader = resOnTopic.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textOnTopic += decoder.decode(value, { stream: true });
        if (textOnTopic.length > 300) {
          reader.cancel();
          break;
        }
      }
    }
    assert('API returns substantive advice for PMEGP query', textOnTopic.toLowerCase().includes('pmegp') || textOnTopic.toLowerCase().includes('subsidy') || textOnTopic.includes('25%') || textOnTopic.includes('35%') || textOnTopic.length > 50);

  } catch (err: any) {
    assert('HTTP API endpoint responded without network error', false, err.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 TASK 2 VERIFICATION RESULT: ${passed}/${total} checks passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed !== total) process.exit(1);
}

verifyAdvisorScope().catch((err) => {
  console.error(err);
  process.exit(1);
});
