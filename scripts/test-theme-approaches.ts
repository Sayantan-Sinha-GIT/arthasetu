import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

async function testThemeApproaches() {
  const css1 = `
@import "tailwindcss";

:root {
  --color-background: #FFFFFF;
  --color-foreground: #091326;
  --color-muted: #334155;
}

.dark {
  --color-background: #080F20;
  --color-foreground: #F8FAFC;
  --color-muted: #CBD5E1;
}

@theme {
  --color-background: var(--color-background);
  --color-foreground: var(--color-foreground);
  --color-muted: var(--color-muted);
}
`;

  const res1 = await postcss([tailwindcss()]).process(css1, { from: 'test.css' });
  console.log('=== Approach 1: :root + .dark + @theme with var() ===');
  console.log('Compiled length:', res1.css.length);
  console.log('Rule .text-foreground:', res1.css.match(/\.text-foreground\s*\{[^}]+\}/g));
  console.log('Rule .text-muted:', res1.css.match(/\.text-muted\s*\{[^}]+\}/g));
  console.log('Rule .bg-background:', res1.css.match(/\.bg-background\s*\{[^}]+\}/g));
}

testThemeApproaches().catch(console.error);
