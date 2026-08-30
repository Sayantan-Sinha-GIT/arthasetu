/**
 * Comprehensive WCAG 2.1 AA Contrast Ratio Verification Script
 * Validates text, badges, cards, and interactive elements across all pages in both Light and Dark mode.
 */
export {};

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): ColorRGB {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getLuminance(rgb: ColorRGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(fgHex: string, bgHex: string): number {
  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);
  const l1 = getLuminance(fgRgb);
  const l2 = getLuminance(bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Design system color palette
const THEME = {
  light: {
    background: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceElevated: '#FFFFFF',
    foreground: '#091326',
    muted: '#334155', // Slate 700
    mutedForeground: '#475569',
    border: '#CBD5E1',
    primary: '#D97706', // Amber 600
    primaryHover: '#B45309',
    saffronTitle: '#D97706', // Amber 600
    saffronBadgeText: '#6B4305', // Saffron 900
    saffronBadgeBg: '#FFEFC2', // Saffron 100
    heroSubtitle: '#334155', // Slate 700
    success: '#065F46',
    successLight: '#D1FAE5',
    warning: '#92400E',
    warningLight: '#FEF3C7',
    danger: '#991B1B',
    dangerLight: '#FEE2E2',
    info: '#1E40AF',
    infoLight: '#DBEAFE',
    navyBadgeText: '#1E3A6E',
    navyBadgeBg: '#D8E0F7',
    navyHeroCardBg: '#080F20',
    navyHeroCardFg: '#F8FAFC',
    navyHeroCardMuted: '#94A3B8',
  },
  dark: {
    background: '#080F20',
    surface: '#0D1B38',
    surfaceElevated: '#152A52',
    foreground: '#F8FAFC',
    muted: '#CBD5E1',
    mutedForeground: '#94A3B8',
    border: '#2D4875',
    primary: '#F59E0B',
    primaryHover: '#FBBF24',
    saffronTitle: '#FFD06B', // Saffron 300
    saffronBadgeText: '#FFD06B', // Saffron 300
    saffronBadgeBg: '#6B4305', // Saffron 900
    heroSubtitle: '#E2E8F0', // Slate 200
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#78350F',
    danger: '#FECACA',
    dangerLight: '#7F1D1D',
    info: '#60A5FA',
    infoLight: '#1E3A8A',
    navyBadgeText: '#93C5FD',
    navyBadgeBg: '#1E3A6E',
    navyHeroCardBg: '#080F20',
    navyHeroCardFg: '#F8FAFC',
    navyHeroCardMuted: '#94A3B8',
  },
};

interface TestItem {
  page: string;
  element: string;
  fgKey: keyof typeof THEME.light;
  bgKey: keyof typeof THEME.light;
  isLargeText?: boolean;
}

const auditItems: TestItem[] = [
  // Landing Page
  { page: 'Landing', element: 'Hero Title (Primary Brand)', fgKey: 'saffronTitle', bgKey: 'background', isLargeText: true },
  { page: 'Landing', element: 'Hero Tagline (Foreground)', fgKey: 'foreground', bgKey: 'background', isLargeText: true },
  { page: 'Landing', element: 'Hero Subtitle (Slate Text)', fgKey: 'heroSubtitle', bgKey: 'background' },
  { page: 'Landing', element: 'Hero Badge Text vs Badge Bg', fgKey: 'saffronBadgeText', bgKey: 'saffronBadgeBg' },
  { page: 'Landing', element: 'Feature Card Title', fgKey: 'foreground', bgKey: 'surfaceElevated', isLargeText: true },
  { page: 'Landing', element: 'Feature Card Description', fgKey: 'muted', bgKey: 'surfaceElevated' },
  { page: 'Landing', element: 'Marquee Strip Label', fgKey: 'muted', bgKey: 'surface' },
  { page: 'Landing', element: 'Parallax Band Badge Text', fgKey: 'foreground', bgKey: 'background', isLargeText: true },

  // Auth (Login & Signup)
  { page: 'Login & Signup', element: 'Form Heading', fgKey: 'foreground', bgKey: 'background', isLargeText: true },
  { page: 'Login & Signup', element: 'Input Label', fgKey: 'foreground', bgKey: 'surfaceElevated' },
  { page: 'Login & Signup', element: 'Input Text Value', fgKey: 'foreground', bgKey: 'surfaceElevated' },
  { page: 'Login & Signup', element: 'Input Placeholder', fgKey: 'mutedForeground', bgKey: 'surfaceElevated' },
  { page: 'Login & Signup', element: 'Danger Alert Text vs Alert Bg', fgKey: 'danger', bgKey: 'dangerLight' },
  { page: 'Login & Signup', element: 'Success Banner Text vs Banner Bg', fgKey: 'success', bgKey: 'successLight' },

  // Admin Login
  { page: 'Admin Login', element: 'Console Title', fgKey: 'foreground', bgKey: 'background', isLargeText: true },
  { page: 'Admin Login', element: 'Console Subtitle', fgKey: 'muted', bgKey: 'background' },
  { page: 'Admin Login', element: 'Input Label', fgKey: 'foreground', bgKey: 'surfaceElevated' },
  { page: 'Admin Login', element: 'Back to Home Link', fgKey: 'muted', bgKey: 'background' },

  // Dashboard
  { page: 'Dashboard', element: 'Welcome Hero Greeting', fgKey: 'navyHeroCardFg', bgKey: 'navyHeroCardBg', isLargeText: true },
  { page: 'Dashboard', element: 'Welcome Hero Muted Detail', fgKey: 'navyHeroCardMuted', bgKey: 'navyHeroCardBg' },
  { page: 'Dashboard', element: 'Cash Flow User Metric Card Fg', fgKey: 'navyHeroCardFg', bgKey: 'navyHeroCardBg' },
  { page: 'Dashboard', element: 'Gramin Score Metric', fgKey: 'foreground', bgKey: 'surface', isLargeText: true },
  { page: 'Dashboard', element: 'Gramin Score Explain Breakdown', fgKey: 'muted', bgKey: 'surface' },
  { page: 'Dashboard', element: 'Gramin Disclaimer Text vs Amber Bg', fgKey: 'warning', bgKey: 'warningLight' },
  { page: 'Dashboard', element: 'Recent Plans Card Title', fgKey: 'foreground', bgKey: 'surfaceElevated' },
  { page: 'Dashboard', element: 'Recent Plans Funding Gap', fgKey: 'muted', bgKey: 'surfaceElevated' },

  // Advisor
  { page: 'Advisor', element: 'Page Header Title', fgKey: 'foreground', bgKey: 'background', isLargeText: true },
  { page: 'Advisor', element: 'Page Header Subtitle', fgKey: 'muted', bgKey: 'background' },
  { page: 'Advisor', element: 'AI Chat Message Text', fgKey: 'foreground', bgKey: 'surfaceElevated' },
  { page: 'Advisor', element: 'AI Disclaimer / Voice Hint', fgKey: 'muted', bgKey: 'surface' },

  // Financial Planner (Both branches)
  { page: 'Planner', element: 'Step Heading', fgKey: 'foreground', bgKey: 'surfaceElevated', isLargeText: true },
  { page: 'Planner', element: 'Mode Switcher Card Text', fgKey: 'muted', bgKey: 'surface' },
  { page: 'Planner', element: 'Calculation Summary Label', fgKey: 'muted', bgKey: 'surface' },
  { page: 'Planner', element: 'Calculation Summary Value', fgKey: 'foreground', bgKey: 'surface', isLargeText: true },
  { page: 'Planner Result', element: 'Result Header Title', fgKey: 'foreground', bgKey: 'background', isLargeText: true },
  { page: 'Planner Result', element: 'Executive Summary Text', fgKey: 'foreground', bgKey: 'surfaceElevated' },
  { page: 'Planner Result', element: 'Table Cost Row', fgKey: 'foreground', bgKey: 'surfaceElevated' },

  // Schemes
  { page: 'Schemes', element: 'Directory Title', fgKey: 'foreground', bgKey: 'background', isLargeText: true },
  { page: 'Schemes', element: 'Scheme Card Name', fgKey: 'foreground', bgKey: 'surfaceElevated', isLargeText: true },
  { page: 'Schemes', element: 'Scheme Description', fgKey: 'muted', bgKey: 'surfaceElevated' },
  { page: 'Schemes', element: 'Level Badge Text vs Badge Bg', fgKey: 'navyBadgeText', bgKey: 'navyBadgeBg' },

  // Profile
  { page: 'Profile', element: 'Profile Header Title', fgKey: 'foreground', bgKey: 'background', isLargeText: true },
  { page: 'Profile', element: 'Completeness Progress Text', fgKey: 'muted', bgKey: 'surfaceElevated' },
  { page: 'Profile', element: 'Form Input Label', fgKey: 'foreground', bgKey: 'surfaceElevated' },

  // Saved Plans / Advice
  { page: 'Saved Plans & Advice', element: 'Saved Card Title', fgKey: 'foreground', bgKey: 'surfaceElevated', isLargeText: true },
  { page: 'Saved Plans & Advice', element: 'Saved Plan Metrics Summary', fgKey: 'muted', bgKey: 'surfaceElevated' },

  // Admin Dashboard & Audit
  { page: 'Admin Dashboard', element: 'Portal Title', fgKey: 'foreground', bgKey: 'background', isLargeText: true },
  { page: 'Admin Dashboard', element: 'Stat Card Label', fgKey: 'muted', bgKey: 'surfaceElevated' },
  { page: 'Admin Dashboard', element: 'Stat Card Value', fgKey: 'foreground', bgKey: 'surfaceElevated', isLargeText: true },
  { page: 'Admin History', element: 'Audit Log Header', fgKey: 'foreground', bgKey: 'background', isLargeText: true },
  { page: 'Admin History', element: 'Audit Diff Entry Text', fgKey: 'foreground', bgKey: 'surfaceElevated' },
  { page: 'Admin Schemes', element: 'Scheme Directory Header', fgKey: 'foreground', bgKey: 'background', isLargeText: true },

  // Footer
  { page: 'Footer', element: 'Disclaimer Notice', fgKey: 'muted', bgKey: 'surfaceElevated' },
  { page: 'Footer', element: 'Credits Team Leaders', fgKey: 'foreground', bgKey: 'surfaceElevated' },
  { page: 'Footer', element: 'Credits Testers', fgKey: 'muted', bgKey: 'surfaceElevated' },
];

console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('🌟 ARTHASETU FULL-SITE WCAG 2.1 AA CONTRAST AUDIT (LIGHT & DARK MODE)');
console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;
const failures: string[] = [];

console.log('| Page / Component | Element Description | Mode | FG Color | BG Color | Contrast Ratio | Required | Status |');
console.log('|---|---|---|---|---|---|---|---|');

for (const item of auditItems) {
  for (const mode of ['light', 'dark'] as const) {
    totalTests++;
    const fg = THEME[mode][item.fgKey];
    const bg = THEME[mode][item.bgKey];
    const ratio = getContrastRatio(fg, bg);
    const minRequired = item.isLargeText ? 3.0 : 4.5;
    const passes = ratio >= minRequired;

    if (passes) {
      passedTests++;
    } else {
      failures.push(`[${mode.toUpperCase()}] ${item.page} - ${item.element}: ${ratio.toFixed(2)}:1 (Min ${minRequired}:1)`);
    }

    console.log(
      `| ${item.page} | ${item.element} | ${mode} | \`${fg}\` | \`${bg}\` | **${ratio.toFixed(2)}:1** | ${minRequired.toFixed(1)}:1 | ${passes ? '✅ PASS' : '❌ FAIL'} |`
    );
  }
}

console.log('\n═════════════════════════════════════════════════════════════════════════════════════════════════════');
console.log(`🏁 CONTRAST AUDIT SUMMARY: ${passedTests}/${totalTests} combinations passed (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════\n');

if (failures.length > 0) {
  console.error('Violations found:');
  failures.forEach(f => console.error(` - ${f}`));
  process.exit(1);
} else {
  console.log('🎉 ALL text elements across ALL pages meet or exceed WCAG AA requirements in both Light and Dark mode!');
}
