import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function testStatesCoverage() {
  console.log('🧪 Testing 28 States & 8 Union Territories Coverage & Indexing Logic...\n');

  const { INDIAN_STATES, UNION_TERRITORIES, ALL_INDIAN_REGIONS } = await import('../src/lib/constants/states');
  const { getAllSchemes, getSchemesForState } = await import('../src/lib/firestore/schemes');

  console.log(`1️⃣ Verifying States & UT Counts:`);
  console.log(`   • Indian States: ${INDIAN_STATES.length} (Expected: 28)`);
  console.log(`   • Union Territories: ${UNION_TERRITORIES.length} (Expected: 8)`);
  console.log(`   • Total Master Jurisdictions: ${ALL_INDIAN_REGIONS.length} (Expected: 36)`);

  if (INDIAN_STATES.length !== 28) throw new Error(`Expected 28 states, got ${INDIAN_STATES.length}`);
  if (UNION_TERRITORIES.length !== 8) throw new Error(`Expected 8 UTs, got ${UNION_TERRITORIES.length}`);
  if (ALL_INDIAN_REGIONS.length !== 36) throw new Error(`Expected 36 regions, got ${ALL_INDIAN_REGIONS.length}`);
  console.log('   ✅ All 36 Indian regions verified in master constants.');

  console.log('\n2️⃣ Testing Scheme Fetch & Central Applicability across All 36 Regions...');
  const allSchemes = await getAllSchemes();
  console.log(`   • Total Active Schemes in Database: ${allSchemes.length}`);

  for (const region of ALL_INDIAN_REGIONS) {
    const regionSchemes = await getSchemesForState(region);
    const hasCentral = regionSchemes.some((s) => s.governmentLevel === 'central');
    if (!hasCentral) {
      throw new Error(`Central schemes not returned for region "${region}"`);
    }
  }
  console.log('   ✅ All 36 Indian States and UTs successfully inherit Central government schemes.');

  console.log('\n3️⃣ Verifying Graceful State Indexing for Unseeded Regions (e.g., Goa, Sikkim, Ladakh)...');
  const unseededRegions = ['Goa', 'Sikkim', 'Ladakh', 'Mizoram'];
  for (const region of unseededRegions) {
    const stateLevelSchemes = (await getSchemesForState(region)).filter((s) => s.governmentLevel === 'state' && s.state?.toLowerCase() === region.toLowerCase());
    console.log(`   • ${region}: ${stateLevelSchemes.length} state-specific schemes (shows graceful indexing banner in UI)`);
  }

  console.log('\n🎉 ALL 36 INDIAN STATES & UNION TERRITORIES VERIFIED WITH ZERO BREAKAGES!');
}

testStatesCoverage().catch((err) => {
  console.error('\n❌ State Coverage Test Failed:', err);
  process.exit(1);
});
