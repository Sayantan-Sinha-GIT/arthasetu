import { lookupPincode } from '../src/lib/constants/pincodes';

async function testPincodePrecisionAudit() {
  const pins = ['700001', '110001', '400001', '636701', '493773'];
  console.log('Testing 5 PIN codes against India Post API & Local Resolver:\n');

  for (const pin of pins) {
    const local = lookupPincode(pin);
    console.log(`📍 PIN: ${pin}`);
    console.log(`   Local lookup: State="${local?.state}", District="${local?.district}", Areas=[${local?.areas.join(', ')}]`);

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { headers: { 'User-Agent': 'ArthaSetu-Precision-Test' } });
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success') {
        const offices = data[0].PostOffice.map((p: any) => p.Name);
        console.log(`   India Post API: State="${data[0].PostOffice[0].State}", District="${data[0].PostOffice[0].District}", Areas=[${offices.join(', ')}]`);
      } else {
        console.log(`   India Post API: Not Found / Error (${JSON.stringify(data[0])})`);
      }
    } catch (err: any) {
      console.log(`   India Post API error: ${err.message}`);
    }
    console.log('');
  }
}

testPincodePrecisionAudit();
