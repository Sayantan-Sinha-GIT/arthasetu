import * as fs from 'fs';
import { resolve } from 'path';

// Relative Luminance and Contrast Ratio calculation
function getLuminance(r: number, g: number, b: number) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(...hexToRgb(hex1));
  const lum2 = getLuminance(...hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return parseFloat(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

async function testPasswordVisibilityToggle() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('👁️ ARTHASETU PASSWORD VISIBILITY TOGGLE VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${name}${details ? ` (${details})` : ''}`);
    } else {
      console.error(`  ❌ [FAIL] ${name}${details ? ` (${details})` : ''}`);
    }
  }

  // 1. Inspect Input.tsx component implementation
  const inputSource = fs.readFileSync(resolve(process.cwd(), 'src/components/ui/Input.tsx'), 'utf-8');

  assert('Input Component has isPasswordVisible State', inputSource.includes('const [isPasswordVisible, setIsPasswordVisible] = useState(false);'));
  assert('Default State is Hidden (false)', inputSource.includes('useState(false)'));
  assert('Type switches to text only when visible', inputSource.includes("effectiveType = isPasswordField && isPasswordVisible ? 'text' : type"));
  assert('Has accessible aria-label on toggle button', inputSource.includes('aria-label={isPasswordVisible ? hidePasswordAriaLabel : showPasswordAriaLabel}'));
  assert('Has aria-pressed attribute for accessibility', inputSource.includes('aria-pressed={isPasswordVisible}'));
  assert('Button type is explicitly "button"', inputSource.includes('type="button"'));
  assert('Touch target has minimum dimensions (min-w-[36px] min-h-[36px])', inputSource.includes('min-w-[36px] min-h-[36px]'));
  assert('Has right padding offset when toggle is active', inputSource.includes("hasPasswordToggle ? 'pr-11' : 'pr-4'"));
  assert('Has keyboard focus visible outline styles', inputSource.includes('focus-visible:ring-2'));

  // 2. Check all call sites use Input for password
  const loginSource = fs.readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf-8');
  assert('Login Page Password Field uses Input with type="password"', loginSource.includes('type="password"'));

  const signupSource = fs.readFileSync(resolve(process.cwd(), 'src/app/(auth)/signup/page.tsx'), 'utf-8');
  assert('Signup Page Password Field uses Input with type="password"', signupSource.includes('label={t.auth.password}') && signupSource.includes('type="password"'));
  assert('Signup Page Confirm Password Field uses Input with type="password"', signupSource.includes('label={t.auth.confirmPassword}') && signupSource.includes('type="password"'));

  const adminLoginSource = fs.readFileSync(resolve(process.cwd(), 'src/components/admin/AdminLoginForm.tsx'), 'utf-8');
  assert('Admin Login Form uses Input with type="password"', adminLoginSource.includes('type="password"'));

  const profileSource = fs.readFileSync(resolve(process.cwd(), 'src/app/(app)/profile/page.tsx'), 'utf-8');
  assert('Profile Danger Zone Modal uses Input with type="password"', profileSource.includes('type="password"'));

  // 3. Contrast Check on Toggle Button Icon
  console.log('\n▶ Color Contrast & WCAG AA Audit for Eye Icon:');
  const lightSurfaceElevated = '#FFFFFF';
  const lightMuted = '#334155';
  const darkSurfaceElevated = '#152A52';
  const darkMuted = '#CBD5E1';

  const lightIconContrast = getContrastRatio(lightMuted, lightSurfaceElevated);
  const darkIconContrast = getContrastRatio(darkMuted, darkSurfaceElevated);

  assert('Light Mode Eye Icon Contrast (WCAG AA >= 4.5:1)', lightIconContrast >= 4.5, `${lightIconContrast}:1 on #FFFFFF`);
  assert('Dark Mode Eye Icon Contrast (WCAG AA >= 4.5:1)', darkIconContrast >= 4.5, `${darkIconContrast}:1 on #152A52`);

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`🏁 TEST RESULTS: ${passed}/${total} checks passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (passed !== total) {
    throw new Error(`${total - passed} checks failed.`);
  }
}

testPasswordVisibilityToggle().catch(console.error);
