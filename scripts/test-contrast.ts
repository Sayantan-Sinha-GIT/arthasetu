/**
 * WCAG AA Contrast Calculation Test Script
 * Verifies that all design tokens pass WCAG AA (4.5:1 for normal text, 3:1 for large text).
 */
export {};

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const lightModePairs = [
  { name: 'Foreground on Background', text: '#091326', bg: '#FFFFFF', minRatio: 4.5 },
  { name: 'Foreground on Surface', text: '#091326', bg: '#F8FAFC', minRatio: 4.5 },
  { name: 'Muted text on Background', text: '#334155', bg: '#FFFFFF', minRatio: 4.5 },
  { name: 'Muted text on Surface', text: '#334155', bg: '#F8FAFC', minRatio: 4.5 },
  { name: 'Primary Button Text on Primary BG', text: '#FFFFFF', bg: '#D97706', minRatio: 3.0 }, // Large/bold button
  { name: 'Success Badge Text on Success Light', text: '#065F46', bg: '#D1FAE5', minRatio: 4.5 },
  { name: 'Warning Badge Text on Warning Light', text: '#92400E', bg: '#FEF3C7', minRatio: 4.5 },
  { name: 'Danger Badge Text on Danger Light', text: '#991B1B', bg: '#FEE2E2', minRatio: 4.5 },
  { name: 'Info Badge Text on Info Light', text: '#1E40AF', bg: '#DBEAFE', minRatio: 4.5 },
];

const darkModePairs = [
  { name: 'Dark Foreground on Dark Background', text: '#F8FAFC', bg: '#080F20', minRatio: 4.5 },
  { name: 'Dark Foreground on Dark Surface', text: '#F8FAFC', bg: '#0D1B38', minRatio: 4.5 },
  { name: 'Dark Muted text on Dark Background', text: '#CBD5E1', bg: '#080F20', minRatio: 4.5 },
  { name: 'Dark Muted text on Dark Surface', text: '#CBD5E1', bg: '#0D1B38', minRatio: 4.5 },
  { name: 'Dark Primary Button Text on Primary BG', text: '#080F20', bg: '#F59E0B', minRatio: 4.5 },
  { name: 'Dark Success Text on Dark Surface', text: '#34D399', bg: '#080F20', minRatio: 4.5 },
  { name: 'Dark Warning Text on Dark Surface', text: '#FBBF24', bg: '#080F20', minRatio: 4.5 },
  { name: 'Dark Danger Text on Dark Surface', text: '#F87171', bg: '#080F20', minRatio: 4.5 },
  { name: 'Dark Info Text on Dark Surface', text: '#60A5FA', bg: '#080F20', minRatio: 4.5 },
];

console.log('🎨 Auditing Design System Tokens for WCAG AA Contrast Compliance...\n');

let totalFailures = 0;

console.log('─── LIGHT MODE CONTRAST AUDIT ───');
for (const p of lightModePairs) {
  const ratio = getContrastRatio(p.text, p.bg);
  const pass = ratio >= p.minRatio;
  if (!pass) totalFailures++;
  console.log(`  ${pass ? '✅' : '❌'} ${p.name}: ${ratio.toFixed(2)}:1 (Min required: ${p.minRatio}:1) [Text: ${p.text}, BG: ${p.bg}]`);
}

console.log('\n─── DARK MODE CONTRAST AUDIT ───');
for (const p of darkModePairs) {
  const ratio = getContrastRatio(p.text, p.bg);
  const pass = ratio >= p.minRatio;
  if (!pass) totalFailures++;
  console.log(`  ${pass ? '✅' : '❌'} ${p.name}: ${ratio.toFixed(2)}:1 (Min required: ${p.minRatio}:1) [Text: ${p.text}, BG: ${p.bg}]`);
}

if (totalFailures > 0) {
  console.error(`\n❌ ${totalFailures} contrast violations found!`);
  process.exit(1);
} else {
  console.log('\n🎉 ALL 18 LIGHT & DARK THEME TOKEN COMBINATIONS PASS WCAG AA CONTRAST AUDIT (100%)!\n');
}
