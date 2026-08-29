import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const lines = envContent.split('\n');
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq > 0) {
    const k = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    console.log(`Key: ${k}, Length: ${val.length}, StartsWith: ${val.slice(0, 5)}...`);
  }
}
