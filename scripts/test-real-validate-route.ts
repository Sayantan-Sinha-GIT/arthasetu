import { POST as validateRouteHandler } from '../src/app/api/validate/route';
import { NextRequest } from 'next/server';
import * as geminiModule from '../src/lib/gemini';

async function testRealRoute() {
  console.log('Testing real route handler with mocked failure...');
  
  // Test Case A: By monkey-patching / overriding generateContent if writable
  let monkeyPatchWorked = false;
  try {
    const orig = (geminiModule as any).generateContent;
    (geminiModule as any).generateContent = async () => {
      throw new Error('Forced Mock Gemini Failure: Network Timeout 5000ms');
    };
    
    const req = new NextRequest('http://localhost:3000/api/validate', {
      method: 'POST',
      body: JSON.stringify({
        businessType: 'Kirana Store',
        businessCategory: 'Retail',
        state: 'Assam',
        district: 'Nagaon',
        monthlyIncome: 40000,
        monthlyExpenses: 25000,
        desiredFunding: 100000,
      }),
    });

    const res = await validateRouteHandler(req);
    const json = await res.json();
    console.log('Real Route Response (Monkey Patch):', json);
    monkeyPatchWorked = json.success === true && json.data.isValid === true;
    (geminiModule as any).generateContent = orig;
  } catch (err) {
    console.log('Monkey patch error (read-only export):', err);
  }

  // Test Case B: By setting GEMINI_API_KEY to invalid key forcing real throw
  const savedKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'INVALID_MOCK_GEMINI_KEY_FORCING_FAILURE';
  
  const req2 = new NextRequest('http://localhost:3000/api/validate', {
    method: 'POST',
    body: JSON.stringify({
      businessType: 'Kirana Store',
      businessCategory: 'Retail',
      state: 'Assam',
      district: 'Nagaon',
      monthlyIncome: 40000,
      monthlyExpenses: 25000,
      desiredFunding: 100000,
    }),
  });

  const res2 = await validateRouteHandler(req2);
  const json2 = await res2.json();
  console.log('Real Route Response (Env Force Throw):', json2);
  
  process.env.GEMINI_API_KEY = savedKey;
  
  console.log('Test complete. Result:', json2.success === true && json2.data.isValid === true);
}

testRealRoute();
