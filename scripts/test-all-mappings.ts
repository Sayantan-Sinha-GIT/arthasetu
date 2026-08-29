import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const testCSS = `
@import "tailwindcss";

:root {
  --color-background: #FFFFFF;
  --color-foreground: #091326;
  --color-surface: #F8FAFC;
  --color-surface-elevated: #FFFFFF;
  --color-border: #CBD5E1;
  --color-border-subtle: #E2E8F0;
  --color-muted: #334155;
  --color-muted-foreground: #475569;

  --color-primary: #D97706;
  --color-primary-foreground: #FFFFFF;
  --color-primary-hover: #B45309;

  --color-secondary: #1E3A6E;
  --color-secondary-foreground: #FFFFFF;
  --color-secondary-hover: #152A52;

  --color-accent: #2563EB;
  --color-accent-foreground: #FFFFFF;

  --color-success: #065F46;
  --color-success-light: #D1FAE5;
  --color-warning: #92400E;
  --color-warning-light: #FEF3C7;
  --color-danger: #991B1B;
  --color-danger-light: #FEE2E2;
  --color-info: #1E40AF;
  --color-info-light: #DBEAFE;
}

.dark {
  --color-background: #080F20;
  --color-foreground: #F8FAFC;
  --color-surface: #0D1B38;
  --color-surface-elevated: #152A52;
  --color-border: #2D4875;
  --color-border-subtle: #1E3A6E;
  --color-muted: #CBD5E1;
  --color-muted-foreground: #94A3B8;

  --color-primary: #F59E0B;
  --color-primary-foreground: #080F20;
  --color-primary-hover: #FBBF24;

  --color-secondary: #3B82F6;
  --color-secondary-foreground: #FFFFFF;
  --color-secondary-hover: #60A5FA;

  --color-success: #34D399;
  --color-success-light: #064E3B;
  --color-warning: #FBBF24;
  --color-warning-light: #78350F;
  --color-danger: #F87171;
  --color-danger-light: #7F1D1D;
  --color-info: #60A5FA;
  --color-info-light: #1E3A8A;
}

@theme {
  --color-saffron-50: #FFF8E7;
  --color-saffron-100: #FFEFC2;
  --color-saffron-200: #FFE199;
  --color-saffron-300: #FFD06B;
  --color-saffron-400: #FFBF3D;
  --color-saffron-500: #F5A623;
  --color-saffron-600: #E08E0B;
  --color-saffron-700: #B87408;
  --color-saffron-800: #8C5906;
  --color-saffron-900: #6B4305;

  --color-navy-50: #EEF2FF;
  --color-navy-100: #D8E0F7;
  --color-navy-200: #B3C1ED;
  --color-navy-300: #8BA0E0;
  --color-navy-400: #6680D3;
  --color-navy-500: #4361C5;
  --color-navy-600: #3450A8;
  --color-navy-700: #1E3A6E;
  --color-navy-800: #152A52;
  --color-navy-900: #0D1B38;
  --color-navy-950: #080F20;

  --color-background: var(--color-background);
  --color-foreground: var(--color-foreground);
  --color-surface: var(--color-surface);
  --color-surface-elevated: var(--color-surface-elevated);
  --color-border: var(--color-border);
  --color-border-subtle: var(--color-border-subtle);
  --color-muted: var(--color-muted);
  --color-muted-foreground: var(--color-muted-foreground);

  --color-primary: var(--color-primary);
  --color-primary-foreground: var(--color-primary-foreground);
  --color-primary-hover: var(--color-primary-hover);

  --color-secondary: var(--color-secondary);
  --color-secondary-foreground: var(--color-secondary-foreground);
  --color-secondary-hover: var(--color-secondary-hover);

  --color-accent: var(--color-accent);
  --color-accent-foreground: var(--color-accent-foreground);

  --color-success: var(--color-success);
  --color-success-light: var(--color-success-light);
  --color-warning: var(--color-warning);
  --color-warning-light: var(--color-warning-light);
  --color-danger: var(--color-danger);
  --color-danger-light: var(--color-danger-light);
  --color-info: var(--color-info);
  --color-info-light: var(--color-info-light);
}
`;

async function run() {
  const result = await postcss([tailwindcss()]).process(testCSS, { from: 'test.css' });
  const out = result.css;
  console.log('Compiled length:', out.length);
  console.log('.text-foreground:', out.match(/\.text-foreground\s*\{[^}]+\}/g));
  console.log('.text-muted:', out.match(/\.text-muted\s*\{[^}]+\}/g));
  console.log('.bg-surface:', out.match(/\.bg-surface\s*\{[^}]+\}/g));
  console.log('.border-border:', out.match(/\.border-border\s*\{[^}]+\}/g));
}

run().catch(console.error);
