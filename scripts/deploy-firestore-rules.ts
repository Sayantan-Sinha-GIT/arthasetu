import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { GoogleAuth } from 'google-auth-library';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function deployRules() {
  console.log('🛡️ Deploying Firestore Security Rules to Firebase project...\n');

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY');

  const sa = JSON.parse(rawKey);
  const formattedPrivateKey = (sa.private_key || sa.privateKey || '').replace(/\\n/g, '\n');
  const projectId = sa.project_id || sa.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Read rules file
  const rulesContent = fs.readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf-8');

  // Authenticate with Google Auth
  const auth = new GoogleAuth({
    credentials: {
      client_email: sa.client_email || sa.clientEmail,
      private_key: formattedPrivateKey,
      project_id: projectId,
    },
    scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const accessTokenResponse = await client.getAccessToken();
  const accessToken = accessTokenResponse.token;

  if (!accessToken) throw new Error('Failed to obtain Google access token');

  // 1. Create Ruleset
  console.log('1️⃣ Uploading new Ruleset to Firebase Rules API...');
  const createRulesetUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`;
  const rulesetRes = await fetch(createRulesetUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent,
          },
        ],
      },
    }),
  });

  const rulesetData = await rulesetRes.json();
  if (!rulesetRes.ok) {
    throw new Error(`Ruleset creation failed: ${JSON.stringify(rulesetData)}`);
  }

  const rulesetName = rulesetData.name;
  console.log(`   ✅ Ruleset created: ${rulesetName}`);

  // 2. Release Ruleset to cloud.firestore
  console.log('2️⃣ Activating ruleset release for cloud.firestore...');
  const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`;
  const releaseRes = await fetch(releaseUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      release: {
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName: rulesetName,
      },
    }),
  });

  const releaseData = await releaseRes.json();
  if (!releaseRes.ok) {
    throw new Error(`Release activation failed: ${JSON.stringify(releaseData)}`);
  }

  console.log(`   ✅ Ruleset successfully released and live: ${releaseData.name}`);
  console.log('\n🎉 FIRESTORE SECURITY RULES DEPLOYED SUCCESSFULLY TO CLOUD FIRESTORE!');
}

deployRules().catch(console.error);
