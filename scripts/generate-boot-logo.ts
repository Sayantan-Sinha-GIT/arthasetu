/**
 * Regenerates `src/lib/boot-logo.ts` from `public/images/logo-mark.png`.
 *
 * The boot screen paints before any other request has come back, so the mark
 * has to travel inside the document itself. Run this after changing the logo.
 *
 *   npx tsx scripts/generate-boot-logo.ts
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

// Displayed at 64 CSS px, so 192 stays crisp on a 3x phone screen. Palette
// quantisation costs nothing visible on a flat two-colour mark and roughly
// halves the bytes we have to carry in every HTML response.
const WIDTH = 192;

async function main() {
  const png = await sharp('public/images/logo-mark.png')
    .trim()
    .resize({ width: WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 82, effort: 10 })
    .toBuffer();

  const { width, height } = await sharp(png).metadata();
  const base64 = png.toString('base64');

  writeFileSync(
    'src/lib/boot-logo.ts',
    `/**
 * The ArthaSetu mark, inlined as a data URI.
 *
 * The boot screen has to paint on the very first frame the browser gets, so
 * it cannot depend on a second request — not the stylesheet, not the font, and
 * not the logo. Downscaled from public/images/logo-mark.png and palette-quantised
 * to keep the cost of carrying it in the document to about ${Math.round(base64.length / 1024)}KB.
 *
 * Regenerate with: npx tsx scripts/generate-boot-logo.ts
 */
export const BOOT_LOGO_WIDTH = ${width};
export const BOOT_LOGO_HEIGHT = ${height};

export const BOOT_LOGO_DATA_URI =
  'data:image/png;base64,${base64}';
`
  );

  console.log(`boot logo: ${png.length} bytes, ${width}x${height}, ${base64.length} base64 chars`);
}

main();
