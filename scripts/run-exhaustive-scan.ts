import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.join(process.cwd(), 'src');

function getAllFiles(dir: string, exts = ['.tsx', '.jsx']): string[] {
  let files: string[] = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(item))) {
      files.push(fullPath);
    }
  }
  return files;
}

const allTsxFiles = getAllFiles(srcDir);
const fileAudits: { file: string; hardcodedStrings: { line: number; text: string; type: string }[] }[] = [];

for (const file of allTsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(srcDir, file).replace(/\\/g, '/');
  const found: { line: number; text: string; type: string }[] = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('import ') || trimmed.startsWith('export type')) {
      return;
    }

    // Check for hardcoded JSX text (>English<)
    const jsxTextMatches = line.match(/>([^<>{}\n]+)</g);
    if (jsxTextMatches) {
      for (const m of jsxTextMatches) {
        const text = m.slice(1, -1).trim();
        if (text.length > 2 && /^[A-Za-z0-9\s,.'":?!()\-–—\/₹%#&*+]+$/.test(text) && /[a-zA-Z]{2,}/.test(text)) {
          if (!['div', 'span', 'svg', 'path', 'button', 'input', 'label', 'h1', 'h2', 'h3', 'p', 'true', 'false', 'null', 'undefined', 'DD-MM-YYYY', 'YYYY', 'MM', 'DD', 'EN', 'HI'].includes(text)) {
            found.push({ line: lineNum, text, type: 'JSX Text' });
          }
        }
      }
    }

    // Check for hardcoded attributes (placeholder, label, title, heading, subtitle)
    const attrMatches = line.match(/(placeholder|label|title|heading|subtitle)\s*=\s*["']([^"']+)["']/g);
    if (attrMatches) {
      for (const am of attrMatches) {
        const p = am.match(/(placeholder|label|title|heading|subtitle)\s*=\s*["']([^"']+)["']/);
        if (p && p[2] && /[a-zA-Z]{3,}/.test(p[2])) {
          if (!p[2].includes('text-') && !p[2].includes('bg-') && !p[2].includes('border-') && !p[2].startsWith('http') && !p[2].startsWith('/')) {
            found.push({ line: lineNum, text: `${p[1]}="${p[2]}"`, type: 'Attribute' });
          }
        }
      }
    }

    // Check for special landing page object properties
    if (relPath === 'app/page.tsx' && (line.includes("desc: '") || line.includes("title: '"))) {
      const match = line.match(/(title|desc):\s*'([^']+)'/);
      if (match) {
        found.push({ line: lineNum, text: `${match[1]}: "${match[2]}"`, type: 'Landing Card Feature' });
      }
    }
  });

  if (found.length > 0) {
    fileAudits.push({ file: relPath, hardcodedStrings: found });
  }
}

console.log(`=== EXHAUSTIVE HARDCODED STRING AUDIT: ${allTsxFiles.length} TOTAL FILES SCANNED ===`);
console.log(`Files with unlocalized strings: ${fileAudits.length}\n`);

fileAudits.forEach(fa => {
  console.log(`📂 src/${fa.file} (${fa.hardcodedStrings.length} items)`);
  fa.hardcodedStrings.forEach(s => {
    console.log(`  - Line ${s.line.toString().padStart(3, ' ')} [${s.type}]: ${s.text}`);
  });
  console.log('');
});
