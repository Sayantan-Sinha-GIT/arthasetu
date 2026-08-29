import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import * as fs from 'fs';
import { resolve } from 'path';

async function testTailwindOutput() {
  const cssInput = fs.readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf-8');
  
  const result = await postcss([tailwindcss()]).process(cssInput, {
    from: resolve(process.cwd(), 'src/app/globals.css'),
  });

  const output = result.css;
  console.log('Total Compiled CSS length:', output.length);

  // Check if .text-foreground and .text-muted exist in the compiled CSS
  const hasTextForeground = output.includes('.text-foreground');
  const hasTextMuted = output.includes('.text-muted');
  console.log('.text-foreground generated:', hasTextForeground);
  console.log('.text-muted generated:', hasTextMuted);

  // Extract rule for .text-foreground
  const fgMatch = output.match(/\.text-foreground\s*\{[^}]+\}/g);
  console.log('Rule .text-foreground:', fgMatch);

  const mutedMatch = output.match(/\.text-muted\s*\{[^}]+\}/g);
  console.log('Rule .text-muted:', mutedMatch);

  const slideUpMatch = output.match(/\.animate-slide-up\s*\{[^}]+\}/g);
  console.log('Rule .animate-slide-up:', slideUpMatch);

  const keyframesSlideUp = output.match(/@keyframes\s+slideUp\s*\{[\s\S]*?\}/g);
  console.log('Keyframes slideUp:', keyframesSlideUp);
}

testTailwindOutput().catch(console.error);
