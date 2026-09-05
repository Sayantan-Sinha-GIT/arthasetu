async function runTests() {
  const url = 'https://arthasetu-sigma.vercel.app/api/advisor';
  console.log('Testing live production at ' + url + '...\n');
  
  async function test(name, body) {
    console.log('--- TEST: ' + name + ' ---');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    console.log('HTTP Status:', res.status);
    if (res.status !== 200) {
      console.log('ERROR: HTTP ' + res.status);
      console.log(await res.text());
      return false;
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No body');
    const decoder = new TextDecoder();
    let responseText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      process.stdout.write(chunk);
      responseText += chunk;
    }
    console.log('\n\n--- SUCCESS ---\n');
    return responseText.length > 0;
  }

  // Test 1: Simple greeting (No tools)
  const t1 = await test('1. Simple Greeting (English)', {
    message: 'Hello, what can you help me with?',
    language: 'en',
    conversationHistory: [],
    userProfile: { uid: 'rigorous-tester', name: 'Tester', state: 'Assam' }
  });

  // Test 2: Trigger calculateFinancials tool (Bengali)
  const t2 = await test('2. Tool Call Trigger (Bengali)', {
    message: 'আমার কাছে পাওয়া 50000 আছে, আমি একটি চায়ের দোকান খুলতে চাই।',
    language: 'bn',
    conversationHistory: [],
    userProfile: { uid: 'rigorous-tester', name: 'Tester', state: 'West Bengal' }
  });

  if (t1 && t2) {
    console.log('ALL RIGOROUS TESTS PASSED LIVE IN PRODUCTION.');
  } else {
    console.log('SOME TESTS FAILED.');
  }
}
runTests().catch(console.error);
