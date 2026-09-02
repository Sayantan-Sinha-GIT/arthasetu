const fs = require('fs');
const { execSync } = require('child_process');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  
  const key = trimmed.slice(0, eqIdx);
  let value = trimmed.slice(eqIdx + 1);
  
  // Remove wrapping quotes if present
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    value = value.slice(1, -1);
  }
  
  if (key === 'VERCEL_OIDC_TOKEN') continue; // Don't upload this
  
  console.log(`Adding ${key}...`);
  try {
    // Add to production
    execSync(`npx vercel env add ${key} production --token vcp_6IWqeSC2BUzThmNxnvGkuSlQXveD4X40MKxB1tgIIosPiESOrB2y4qfr`, {
      input: value,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`Successfully added ${key} to production`);
  } catch (err) {
    console.log(`Failed to add ${key}: ${err.message}`);
    if (err.stderr) console.log(err.stderr.toString());
  }
}
