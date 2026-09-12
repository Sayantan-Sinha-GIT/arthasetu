import jsPDF from 'jspdf';
import { DEFAULT_LOAN_INTEREST_RATE_PERCENT, DEFAULT_LOAN_TENURE_MONTHS } from '@/lib/calculator';
import { calculateGraminScore, graminInputsFromProfile } from '@/lib/gramin-score';
import { GENDER_KEYS, GRAMIN_BAND_KEYS } from '@/lib/constants/profile-options';
import { detectScriptLanguage } from '@/lib/lang/detectScript';
import type { PlanInputs, CalculatedValues, UserProfile } from '@/types';

/** Which Noto font covers each language's script. Anything unlisted prints in Helvetica. */
const SCRIPT_FONTS: Array<{ langs: string[]; file: string; name: string }> = [
  { langs: ['hi', 'mr', 'ne', 'sa', 'mai', 'doi', 'brx', 'kok'], file: 'NotoSansDevanagari-Regular.ttf', name: 'NotoSansDevanagari' },
  // Manipuri is written in Bengali script
  { langs: ['bn', 'as', 'mni'], file: 'NotoSansBengali-Regular.ttf', name: 'NotoSansBengali' },
  // Santali is written in Ol Chiki; no other font has those glyphs
  { langs: ['sat'], file: 'NotoSansOlChiki-Regular.ttf', name: 'NotoSansOlChiki' },
  // Odia uses its own distinct script — NOT Bengali glyphs
  { langs: ['or'], file: 'NotoSansOriya-Regular.ttf', name: 'NotoSansOriya' },
  { langs: ['ta'], file: 'NotoSansTamil-Regular.ttf', name: 'NotoSansTamil' },
  { langs: ['te'], file: 'NotoSansTelugu-Regular.ttf', name: 'NotoSansTelugu' },
  { langs: ['kn'], file: 'NotoSansKannada-Regular.ttf', name: 'NotoSansKannada' },
  { langs: ['ml'], file: 'NotoSansMalayalam-Regular.ttf', name: 'NotoSansMalayalam' },
  { langs: ['gu'], file: 'NotoSansGujarati-Regular.ttf', name: 'NotoSansGujarati' },
  { langs: ['pa'], file: 'NotoSansGurmukhi-Regular.ttf', name: 'NotoSansGurmukhi' },
  { langs: ['ur', 'sd', 'ks'], file: 'NotoSansArabic-Regular.ttf', name: 'NotoSansArabic' },
];

/**
 * Characters Helvetica can print. jsPDF's built-in fonts are WinAnsi-only, and
 * handed anything else — "₹", or the non-breaking hyphen models write in
 * "pre‑booking" — they silently re-encode the whole line at two bytes a letter.
 * That printed "₹1,625" as "¹1,625", which reads as 11,625 on a loan document,
 * and spread each such line out letter by letter until it ran off the page.
 */
const WINANSI_EXTRAS = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
function isWinAnsi(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return c === 0x0a || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WINANSI_EXTRAS.has(ch);
}

/** Turns model and user text into something every font in the report can draw. */
export function normalizePdfText(text: string, helveticaOnly: boolean, keepRupeeSign = false): string {
  const out = String(text ?? '')
    .replace(/\*\*|__|`/g, '') // markdown emphasis the model sometimes leaves in
    .replace(/₹\s*/g, keepRupeeSign ? '₹' : 'Rs. ') // the same "Rs." every table uses, where ₹ cannot be drawn
    .replace(/[‐‑‒−]/g, '-') // hyphen variants and the minus sign
    .replace(/[     \t]/g, ' ') // non-breaking, thin and tab spaces
    .replace(/[​⁠﻿\r]/g, '') // zero-width characters
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}️]/gu, ''); // emoji, which no font here has
  return helveticaOnly ? [...out].filter(isWinAnsi).join('') : out;
}

interface ExportPdfOptions {
  inputs: PlanInputs;
  calculated: CalculatedValues;
  narrative: {
    executiveSummary: string;
    keyAssumptions: string[];
    riskAnalysis: string[];
    actionableNextSteps: string[];
  };
  profile?: Partial<UserProfile> | null;
  graminScore?: number;
  graminBand?: string;
  t?: unknown;
  language?: string;
}

const PT_TO_MM = 25.4 / 72;
/**
 * Canvas pixels per point when text is drawn as an image: about 290 dpi, sharp
 * in print. Higher made a two-page Hindi report over 900 KB to share.
 */
const CANVAS_TEXT_SCALE = 4;

interface CanvasTextRenderer {
  /** Width in mm. */
  measure(text: string, sizePt: number, style: string): number;
  wrap(text: string, maxWidthMm: number, sizePt: number, style: string): string[];
  draw(doc: jsPDF, text: string, x: number, baselineY: number, sizePt: number, style: string, align: 'left' | 'right' | 'center'): void;
}

/**
 * Text drawn by the browser instead of by jsPDF, for every report in an Indian script.
 *
 * jsPDF places glyphs one at a time and does no shaping, so Indic text came out
 * visibly misspelt: the short-i sign drawn after its consonant ("प्रस्तावति" for
 * "प्रस्तावित"), conjuncts broken apart, Urdu letters unjoined. The browser's own
 * text engine shapes all of these correctly, so each line is drawn on a canvas
 * and placed in the PDF as an image at print resolution. The browser also falls
 * back font by font per character, so English words, digits and ₹ inside a
 * Hindi sentence render properly with no run splitting at all.
 *
 * Null outside a browser (tests run in Node), where the jsPDF font path is used.
 */
async function createCanvasTextRenderer(fontFile: string, familyName: string, rtl = false): Promise<CanvasTextRenderer | null> {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return null;
  try {
    const face = new FontFace(familyName, `url(/fonts/${fontFile})`);
    await face.load();
    document.fonts.add(face);
  } catch (err) {
    console.warn('PDF script font could not be loaded for canvas text:', err);
    return null;
  }
  const measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return null;

  const fontCss = (sizePt: number, style: string) =>
    `${style === 'bold' ? 700 : 400} ${sizePt * CANVAS_TEXT_SCALE}px "${familyName}", Arial, Helvetica, sans-serif`;
  const mmPerPx = PT_TO_MM / CANVAS_TEXT_SCALE;

  const measure = (text: string, sizePt: number, style: string) => {
    measureCtx.font = fontCss(sizePt, style);
    return measureCtx.measureText(text).width * mmPerPx;
  };

  const wrap = (text: string, maxWidthMm: number, sizePt: number, style: string) => {
    const lines: string[] = [];
    for (const paragraph of String(text).split('\n')) {
      let current = '';
      for (const word of paragraph.split(' ').filter(Boolean)) {
        const candidate = current ? `${current} ${word}` : word;
        if (measure(candidate, sizePt, style) <= maxWidthMm) {
          current = candidate;
          continue;
        }
        if (current) lines.push(current);
        current = '';
        if (measure(word, sizePt, style) <= maxWidthMm) {
          current = word;
          continue;
        }
        // A single word wider than the column is broken by character.
        for (const ch of Array.from(word)) {
          if (current && measure(current + ch, sizePt, style) > maxWidthMm) {
            lines.push(current);
            current = ch;
          } else {
            current += ch;
          }
        }
      }
      lines.push(current);
    }
    return lines.length > 0 ? lines : [''];
  };

  const draw = (doc: jsPDF, text: string, x: number, baselineY: number, sizePt: number, style: string, align: 'left' | 'right' | 'center') => {
    if (!text) return;
    const px = sizePt * CANVAS_TEXT_SCALE;
    measureCtx.font = fontCss(sizePt, style);
    const textWidthPx = measureCtx.measureText(text).width;
    const pad = Math.ceil(px * 0.3);
    // Room above the baseline for Indic top marks, and below it for descending vowel signs.
    const above = Math.ceil(px * 1.15);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(textWidthPx + pad * 2));
    canvas.height = above + Math.ceil(px * 0.55);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = fontCss(sizePt, style);
    ctx.fillStyle = doc.getTextColor();
    ctx.textBaseline = 'alphabetic';
    if (rtl) {
      // Right-to-left base direction, so colons, numbers and embedded English
      // land where an Urdu reader expects them rather than at the wrong end.
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillText(text, pad + textWidthPx, above);
    } else {
      ctx.fillText(text, pad, above);
    }

    const widthMm = textWidthPx * mmPerPx;
    const startX = align === 'right' ? x - widthMm : align === 'center' ? x - widthMm / 2 : x;
    doc.addImage(
      canvas,
      'PNG',
      startX - pad * mmPerPx,
      baselineY - above * mmPerPx,
      canvas.width * mmPerPx,
      canvas.height * mmPerPx,
      undefined,
      'FAST'
    );
  };

  return { measure, wrap, draw };
}

const fetchFontBase64 = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch font');
    const buffer = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.error('Font fetch error:', err);
    return null;
  }
};

export async function generateBankReadyPlanPdf({
  inputs,
  calculated,
  narrative,
  profile,
  graminScore,
  graminBand,
  t,
  language = 'en',
}: ExportPdfOptions): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Decide font based on language
  let fontName = 'helvetica';
  let fontStyle = 'normal';

  // Load a script font if needed. The screen language decides first, then the
  // text itself: an English screen can still carry a business name or plan
  // typed in Bengali, which Helvetica cannot draw at all.
  const contentSample = [
    narrative.executiveSummary,
    ...(narrative.keyAssumptions || []),
    ...(narrative.riskAnalysis || []),
    ...(narrative.actionableNextSteps || []),
    inputs.businessType,
    inputs.location,
    profile?.name,
  ].filter(Boolean).join(' ');
  const scriptFont =
    SCRIPT_FONTS.find((f) => f.langs.includes(language)) ??
    SCRIPT_FONTS.find((f) => f.langs.includes(detectScriptLanguage(contentSample)));
  // In a browser the script's text is shaped and drawn by the browser itself
  // (see createCanvasTextRenderer). The font is embedded for jsPDF only where
  // that is unavailable.
  let canvasText: CanvasTextRenderer | null = null;
  if (scriptFont) {
    canvasText = await createCanvasTextRenderer(
      scriptFont.file,
      `ArthaSetuPdf${scriptFont.name}`,
      scriptFont.name === 'NotoSansArabic' // Urdu, Sindhi and Kashmiri read right to left
    );
    if (!canvasText) {
      const b64 = await fetchFontBase64(`/fonts/${scriptFont.file}`);
      if (b64) {
        doc.addFileToVFS(`${scriptFont.name}.ttf`, b64);
        doc.addFont(`${scriptFont.name}.ttf`, scriptFont.name, 'normal');
        doc.addFont(`${scriptFont.name}.ttf`, scriptFont.name, 'bold');
        fontName = scriptFont.name;
      }
    }
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const navy = [30, 58, 110];
  const saffron = [217, 119, 6];
  const slateDark = [15, 23, 42];
  const slateMuted = [71, 85, 105];
  const green = [6, 95, 70];
  const borderGray = [203, 213, 225];

  const formatCurrency = (val: number) => {
    const numberPart = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(val);
    // ₹ wherever the browser draws the text; Helvetica has no ₹ glyph.
    return canvasText ? `₹${numberPart}` : `Rs. ${numberPart}`;
  };

  const getT = (key: string, fallback: string) => {
    if (!t) return fallback;
    const keys = key.split('.');
    let val: unknown = t;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = (val as Record<string, unknown>)[k];
      } else {
        return fallback;
      }
    }
    return typeof val === 'string' ? val : fallback;
  };

  // jsPDF does not do full complex-script text shaping (Indic conjuncts,
  // ligatures) — its per-character width math for custom Noto TTFs can run a
  // bit optimistic for non-Latin scripts, letting a "line" it thinks fits
  // actually render wider than the column. Wrapping to a slightly narrower
  // effective width for script-font reports gives real headroom against
  // that mismatch. Helvetica measurement is accurate, so no shrink there.
  const WRAP_SAFETY = canvasText || fontName === 'helvetica' ? 1 : 0.82;
  // mm of vertical space per wrapped line at a given pt font size, with a
  // bit of extra leading over the font's natural line height as a buffer.
  const LINE_H = (size: number) => size * 0.46;

  const wrapLines = (text: string, maxWidth: number, size: number, theFontName = fontName, style = fontStyle) => {
    // Every string in the report is wrapped here first, so this is where it is made printable.
    if (canvasText) return canvasText.wrap(normalizePdfText(text, false, true), maxWidth, size, style);
    doc.setFont(theFontName, style);
    doc.setFontSize(size);
    return doc.splitTextToSize(normalizePdfText(text, fontName === 'helvetica'), maxWidth * WRAP_SAFETY) as string[];
  };

  // Pre-measures the tallest cell in a row so the row's background/height can
  // be sized correctly BEFORE anything is drawn — this is what prevents a
  // second wrapped line from being silently painted over by the next row.
  const measureRowHeight = (cells: Array<{ text: string; width: number; size?: number }>, minH = 7) => {
    let maxLines = 1;
    for (const c of cells) {
      const lines = wrapLines(c.text, c.width, c.size || 8.5).length;
      if (lines > maxLines) maxLines = lines;
    }
    return Math.max(minH, maxLines * LINE_H(8.5) + 3);
  };

  // The downloaded Noto Sans <Script> subset fonts carry NO Latin a-z/A-Z
  // glyphs at all (only the script itself, digits, and common punctuation —
  // confirmed by direct testing). Any English word mixed into a translated
  // string (acronyms like "PAT"/"MUDRA", or an untranslated fallback) hits an
  // unmapped glyph and jsPDF silently stops emitting output for the rest of
  // that text run. The fix is standard font-fallback: split each line into
  // runs of ASCII vs. everything-else, and switch to 'helvetica' (full ASCII
  // coverage, always available) for ASCII runs. This is deliberately broader
  // than "just letters" — testing found these subset fonts are missing not
  // only A-Z/a-z but also some ASCII punctuation (e.g. "@"), and there is no
  // reliable way to know in advance which symbols a given subset omits.
  // Routing all ASCII to helvetica sidesteps that guesswork entirely; Rs. is
  // ASCII and routes to helvetica, while the script's own glyphs stay on the native font.
  // Everything Helvetica can encode, not only ASCII: the bullet and dashes are
  // missing from the Noto subsets too, and were vanishing from every non-English report.
  const isLatinLetter = isWinAnsi;

  const splitRuns = (line: string): Array<{ text: string; latin: boolean }> => {
    if (fontName === 'helvetica') return [{ text: line, latin: false }]; // English doc: no fallback needed
    const runs: Array<{ text: string; latin: boolean }> = [];
    let cur = '';
    let curLatin: boolean | null = null;
    for (const ch of line) {
      const latin = isLatinLetter(ch);
      if (curLatin === null || latin === curLatin) {
        cur += ch;
      } else {
        runs.push({ text: cur, latin: curLatin as boolean });
        cur = ch;
      }
      curLatin = latin;
    }
    if (cur) runs.push({ text: cur, latin: curLatin as boolean });
    return runs;
  };

  const runWidth = (run: { text: string; latin: boolean }, size: number, style: string) => {
    doc.setFont(run.latin ? 'helvetica' : fontName, style);
    doc.setFontSize(size);
    return doc.getTextWidth(run.text);
  };

  const lineWidthMixed = (line: string, size: number, style: string) =>
    canvasText
      ? canvasText.measure(line, size, style)
      : splitRuns(line).reduce((sum, run) => sum + runWidth(run, size, style), 0);

  // Draws one already-wrapped line, switching fonts mid-line as needed.
  const drawLineMixed = (line: string, x: number, yPos: number, size: number, style: string, align: 'left' | 'right' | 'center') => {
    if (canvasText) {
      canvasText.draw(doc, line, x, yPos, size, style, align);
      return;
    }
    const runs = splitRuns(line);
    let startX = x;
    if (align === 'right') startX = x - lineWidthMixed(line, size, style);
    else if (align === 'center') startX = x - lineWidthMixed(line, size, style) / 2;
    let curX = startX;
    for (const run of runs) {
      if (!run.text) continue;
      doc.setFont(run.latin ? 'helvetica' : fontName, style);
      doc.setFontSize(size);
      doc.text(run.text, curX, yPos);
      curX += doc.getTextWidth(run.text);
    }
  };

  const drawMultilineMixed = (lines: string[], x: number, startY: number, size: number, style: string, align: 'left' | 'right' | 'center' = 'left') => {
    lines.forEach((line, i) => drawLineMixed(line, x, startY + i * LINE_H(size), size, style, align));
  };

  const drawTextWrapped = (text: string, x: number, currentY: number, maxWidth: number, align: 'left' | 'right' | 'center' = 'left', theFontName = fontName, size = 8.5) => {
    const lines = wrapLines(text, maxWidth, size, theFontName, fontStyle);
    drawMultilineMixed(lines, x, currentY, size, fontStyle, align);
    return lines.length * LINE_H(size);
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
      drawHeaderMini();
    }
  };

  const drawHeaderMini = () => {
    doc.setFillColor(30, 58, 110);
    doc.rect(margin, y, contentWidth, 2, 'F');
    y += 6;
  };

  // ─── COVER / HEADER BANNER ───
  doc.setFillColor(30, 58, 110);
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont(fontName, 'bold');
  fontStyle = 'bold';
  // No translated report title exists, so other languages lead with the app's
  // name; the translated subtitle right below says what the document is.
  drawTextWrapped(language === 'en' ? 'ARTHASETU | BANK-READY PROJECT REPORT' : getT('appName', 'ArthaSetu'), margin + 6, y + 10, contentWidth - 12, 'left', fontName, 14);

  fontStyle = 'normal';
  drawTextWrapped(getT('planner.pdfProjectSubtitle', 'Project: {{type}} — MSME Credit & Subsidy Assessment').replace('{{type}}', (inputs.businessType || getT('planner.pdfNA', 'N/A')).toUpperCase()), margin + 6, y + 17, contentWidth - 12, 'left', fontName, 9);

  drawTextWrapped(
    getT('planner.pdfGeneratedRef', 'Generated: {{date}} | Ref: {{ref}}').replace('{{date}}', new Date().toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })).replace('{{ref}}', 'AS-' + Date.now().toString().slice(-6)),
    margin + 6,
    y + 22,
    contentWidth - 12, 'left', fontName, 8
  );

  y += 32;

  // ─── 1. ENTREPRENEUR & PROJECT METADATA TABLE ───
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  fontStyle = 'bold';
  drawTextWrapped(getT('planner.pdfMetaTitle', '1. Entrepreneur & Project Metadata'), margin, y, contentWidth, 'left', fontName, 11);
  y += 4;

  const col1 = margin + 4;
  const col2 = margin + 45;
  const col3 = margin + 100;
  const col4 = margin + 140;

  // Never a made-up score. This printed "720 / 900 (Strong Financial Readiness)"
  // for everyone, because no caller passed one. Now derived from the profile the
  // same way the dashboard card is, or shown as not available.
  const derivedGramin = graminScore === undefined && profile ? calculateGraminScore(graminInputsFromProfile(profile)) : null;
  const scoreValue = graminScore ?? derivedGramin?.score;
  const bandValue = graminBand ?? derivedGramin?.band;

  // Stored values (score bands, genders) are English. Shown translated, and in
  // another language left out when no translation exists, rather than printing
  // English words into a Hindi report.
  const localizedOption = (group: string, keys: Record<string, string>, value?: string) => {
    if (!value) return '';
    const key = keys[value];
    const localized = key ? getT(`${group}.${key}`, value) : value;
    return language !== 'en' && localized === value ? '' : localized;
  };
  const bandLabel = localizedOption('graminScore.bands', GRAMIN_BAND_KEYS, bandValue);
  const genderLabel = localizedOption('onboarding.genderOptions', GENDER_KEYS, profile?.gender);

  const graminText = scoreValue === undefined
    ? getT('planner.pdfNA', 'N/A')
    : `${scoreValue} / 900${bandLabel ? ` (${bandLabel})` : ''}`;

  const metaRows: Array<[string, string, string, string]> = [
    [
      getT('planner.pdfApplicant', 'Applicant / Entity:'),
      profile?.name || getT('planner.pdfRegEntrepreneur', 'Registered Entrepreneur'),
      getT('planner.pdfCategoryGender', 'Category / Gender:'),
      // "GENERAL" was a caste category the app never asks about, printed for everyone.
      `${getT('planner.pdfIndividual', 'INDIVIDUAL')}${genderLabel ? ` / ${language === 'en' ? genderLabel.toUpperCase() : genderLabel}` : ''}`,
    ],
    [
      getT('planner.pdfOpScale', 'Operating Scale:'),
      inputs.businessScale || getT('planner.pdfStdCapacity', 'Standard Operational Capacity'),
      getT('planner.pdfPlanModel', 'Plan Model:'),
      inputs.planType === 'existing_expansion' ? getT('planner.pdfExistingExp', 'Existing Expansion') : getT('planner.pdfNewStartup', 'New Startup Unit'),
    ],
    [
      getT('planner.pdfOpLocation', 'Operating Location:'),
      inputs.location || getT('planner.pdfRuralUnit', 'Rural / Semi-Urban Unit'),
      getT('planner.pdfGraminScore', 'Gramin Credit Score:'),
      graminText,
    ],
  ];

  // Measure the whole box height first from every cell's real wrap count.
  let metaBoxHeight = 6; // top padding
  const metaRowHeights = metaRows.map((row) => {
    const h = Math.max(
      wrapLines(row[0], col2 - col1 - 2, 8).length,
      wrapLines(row[1], col3 - col2 - 2, 8.5).length,
      wrapLines(row[2], col4 - col3 - 2, 8).length,
      wrapLines(row[3], pageWidth - col4 - margin, 8.5).length,
    ) * LINE_H(8.5);
    metaBoxHeight += h;
    return h;
  });
  metaBoxHeight += 4; // bottom padding

  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, metaBoxHeight, 2, 2, 'FD');

  let rowY = y + 6;
  metaRows.forEach((row, i) => {
    fontStyle = 'normal';
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    drawTextWrapped(row[0], col1, rowY, col2 - col1 - 2, 'left', fontName, 8);
    drawTextWrapped(row[2], col3, rowY, col4 - col3 - 2, 'left', fontName, 8);

    fontStyle = 'bold';
    doc.setTextColor(i === 2 ? green[0] : slateDark[0], i === 2 ? green[1] : slateDark[1], i === 2 ? green[2] : slateDark[2]);
    drawTextWrapped(row[1], col2, rowY, col3 - col2 - 2, 'left', fontName, 8.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    drawTextWrapped(row[3], col4, rowY, pageWidth - col4 - margin, 'left', fontName, 8.5);

    rowY += metaRowHeights[i];
  });

  y += metaBoxHeight + 6;

  // ─── 2. CAPITAL OUTLAY & PROJECT COST (CAPEX) ───
  checkPageBreak(50);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  fontStyle = 'bold';
  drawTextWrapped(getT('planner.pdfCapexTitle', '2. Total Project Capital Outlay'), margin, y, contentWidth, 'left', fontName, 11);
  y += 4;

  const capexNameW = 66, capexDescW = 74, capexAmtW = 44;
  const headerH = measureRowHeight([
    { text: getT('planner.pdfComponentItem', 'Component Item'), width: capexNameW },
    { text: getT('planner.pdfPurposeDesc', 'Purpose / Description'), width: capexDescW },
    { text: getT('planner.pdfAmount', 'Amount'), width: capexAmtW },
  ], 7);
  doc.setFillColor(30, 58, 110);
  doc.rect(margin, y, contentWidth, headerH, 'F');
  doc.setTextColor(255, 255, 255);
  fontStyle = 'bold';
  drawTextWrapped(getT('planner.pdfComponentItem', 'Component Item'), margin + 4, y + 5, capexNameW, 'left', fontName, 8.5);
  drawTextWrapped(getT('planner.pdfPurposeDesc', 'Purpose / Description'), margin + 74, y + 5, capexDescW, 'left', fontName, 8.5);
  drawTextWrapped(getT('planner.pdfAmount', 'Amount'), pageWidth - margin - 4, y + 5, capexAmtW, 'right', fontName, 8.5);
  y += headerH;

  const capexItems = [
    { name: getT('planner.pdfCapexEq', 'Equipment & Machinery'), desc: getT('planner.pdfCapexEqDesc', 'Plant machinery, primary tools'), amt: inputs.equipmentCost },
    { name: getT('planner.pdfCapexCivil', 'Civil Infrastructure / Shed'), desc: getT('planner.pdfCapexCivilDesc', 'Shed civil setup, electrification'), amt: inputs.setupCost },
    { name: getT('planner.pdfCapexRaw', 'Initial Raw Materials / Stock'), desc: getT('planner.pdfCapexRawDesc', 'Starting inventory / first batch'), amt: inputs.initialInventory },
    { name: getT('planner.pdfCapexWc', 'Working Capital Reserve'), desc: getT('planner.pdfCapexWcDesc', 'Liquidity safety buffer'), amt: inputs.workingCapitalReserve },
  ];

  capexItems.forEach((item, idx) => {
    const rowH = measureRowHeight([
      { text: item.name, width: capexNameW, size: 8 },
      { text: item.desc, width: capexDescW, size: 8 },
      { text: formatCurrency(item.amt || 0), width: capexAmtW, size: 8.5 },
    ]);
    checkPageBreak(rowH);
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, rowH, 'F');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    fontStyle = 'normal';
    drawTextWrapped(item.name, margin + 4, y + 5, capexNameW, 'left', fontName, 8);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    drawTextWrapped(item.desc, margin + 74, y + 5, capexDescW, 'left', fontName, 8);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    fontStyle = 'bold';
    drawTextWrapped(formatCurrency(item.amt || 0), pageWidth - margin - 4, y + 5, capexAmtW, 'right', fontName, 8.5);
    y += rowH;
  });

  const totalRowH = measureRowHeight([
    { text: getT('planner.totalInvestment', 'TOTAL CAPITAL REQUIRED (A)'), width: 100 },
    { text: formatCurrency(calculated.totalInitialCost), width: 44, size: 9 },
  ], 8);
  doc.setFillColor(238, 242, 255);
  doc.rect(margin, y, contentWidth, totalRowH, 'F');
  fontStyle = 'bold';
  doc.setTextColor(navy[0], navy[1], navy[2]);
  drawTextWrapped(getT('planner.totalInvestment', 'TOTAL CAPITAL REQUIRED (A)'), margin + 4, y + 5.5, 100, 'left', fontName, 8.5);
  drawTextWrapped(formatCurrency(calculated.totalInitialCost), pageWidth - margin - 4, y + 5.5, 44, 'right', fontName, 9);
  y += totalRowH + 5;

  // ─── 3. MEANS OF FINANCE ───
  checkPageBreak(45);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  fontStyle = 'bold';
  drawTextWrapped(getT('planner.pdfMeansOfFinance', '3. Means of Finance & Proposed Loan Structuring'), margin, y, contentWidth, 'left', fontName, 11);
  y += 4;

  const finNameW = 64, finPctW = 34, finAmtW = 44;
  const finHeaderH = measureRowHeight([
    { text: getT('planner.pdfFinanceSource', 'Financing Source'), width: finNameW },
    { text: getT('planner.pdfPercentage', 'Percentage'), width: finPctW },
    { text: getT('planner.pdfAmount', 'Amount'), width: finAmtW },
  ], 7);
  doc.setFillColor(30, 58, 110);
  doc.rect(margin, y, contentWidth, finHeaderH, 'F');
  doc.setTextColor(255, 255, 255);
  fontStyle = 'bold';
  drawTextWrapped(getT('planner.pdfFinanceSource', 'Financing Source'), margin + 4, y + 5, finNameW, 'left', fontName, 8.5);
  drawTextWrapped(getT('planner.pdfPercentage', 'Percentage'), margin + 74, y + 5, finPctW, 'left', fontName, 8.5);
  drawTextWrapped(getT('planner.pdfAmount', 'Amount'), pageWidth - margin - 4, y + 5, finAmtW, 'right', fontName, 8.5);
  y += finHeaderH;

  const promoterEquity = Math.min(inputs.availableSavings || 0, calculated.totalInitialCost);
  const equityPercent = Math.round((promoterEquity / calculated.totalInitialCost) * 100) || 0;
  const loanPercent = Math.round((calculated.fundingGap / calculated.totalInitialCost) * 100) || 0;

  const financeItems = [
    { name: getT('planner.pdfPromoterEquity', 'Promoter Equity'), pct: `${equityPercent}%`, amt: promoterEquity },
    { name: getT('planner.pdfBankLoan', 'Proposed Bank Term Loan'), pct: `${loanPercent}%`, amt: calculated.fundingGap },
  ];

  financeItems.forEach((item, idx) => {
    const rowH = measureRowHeight([
      { text: item.name, width: finNameW, size: 8 },
      { text: item.pct, width: finPctW, size: 8 },
      { text: formatCurrency(item.amt || 0), width: finAmtW, size: 8.5 },
    ]);
    checkPageBreak(rowH);
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, rowH, 'F');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    fontStyle = 'normal';
    drawTextWrapped(item.name, margin + 4, y + 5, finNameW, 'left', fontName, 8);
    drawTextWrapped(item.pct, margin + 74, y + 5, finPctW, 'left', fontName, 8);
    fontStyle = 'bold';
    drawTextWrapped(formatCurrency(item.amt || 0), pageWidth - margin - 4, y + 5, finAmtW, 'right', fontName, 8.5);
    y += rowH;
  });

  const emiLabel = getT('planner.pdfEstEmi', 'Est. Monthly EMI (@ {{rate}}% / {{mo}} mo):').replace('{{rate}}', (inputs.loanInterestRatePercent ?? DEFAULT_LOAN_INTEREST_RATE_PERCENT).toString()).replace('{{mo}}', (inputs.loanTenureMonths ?? DEFAULT_LOAN_TENURE_MONTHS).toString());
  const emiAmt = `${formatCurrency(calculated.monthlyLoanEmi)} / ${getT('planner.pdfMo', 'mo')}`;
  const emiRowH = measureRowHeight([
    { text: emiLabel, width: 120 },
    { text: emiAmt, width: 54 },
  ], 8);
  checkPageBreak(emiRowH);
  doc.setFillColor(254, 243, 199);
  doc.rect(margin, y, contentWidth, emiRowH, 'F');
  fontStyle = 'bold';
  doc.setTextColor(saffron[0], saffron[1], saffron[2]);
  drawTextWrapped(emiLabel, margin + 4, y + 5.5, 120, 'left', fontName, 8.5);
  drawTextWrapped(emiAmt, pageWidth - margin - 4, y + 5.5, 54, 'right', fontName, 8.5);
  y += emiRowH + 5;

  // ─── 4. PROJECTED MONTHLY CASH FLOW (OPEX) ───
  checkPageBreak(55);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  fontStyle = 'bold';
  drawTextWrapped(getT('planner.pdfOpexTitle', '4. Projected Monthly Operating Performance'), margin, y, contentWidth, 'left', fontName, 11);
  y += 4;

  const opexHeadW = 118, opexAmtW = 44;
  const opexHeaderH = measureRowHeight([
    { text: getT('planner.pdfRevExpHead', 'Revenue / Expense Head'), width: opexHeadW },
    { text: getT('planner.pdfMonthlyAmount', 'Monthly Amount'), width: opexAmtW },
  ], 7);
  doc.setFillColor(30, 58, 110);
  doc.rect(margin, y, contentWidth, opexHeaderH, 'F');
  doc.setTextColor(255, 255, 255);
  drawTextWrapped(getT('planner.pdfRevExpHead', 'Revenue / Expense Head'), margin + 4, y + 5, opexHeadW, 'left', fontName, 8.5);
  drawTextWrapped(getT('planner.pdfMonthlyAmount', 'Monthly Amount'), pageWidth - margin - 4, y + 5, opexAmtW, 'right', fontName, 8.5);
  y += opexHeaderH;

  const opexItems = [
    { name: getT('planner.pdfOpexSales', '(+) Projected Gross Sales'), amt: calculated.monthlyGrossRevenue, isPos: true },
    { name: getT('planner.pdfOpexRaw', '(-) Raw Material'), amt: inputs.monthlyRawMaterials, isPos: false },
    { name: getT('planner.pdfOpexRent', '(-) Rent & Utilities'), amt: inputs.monthlyRentUtilities, isPos: false },
    { name: getT('planner.pdfOpexLabor', '(-) Labor & Wages'), amt: inputs.monthlyLabor, isPos: false },
    { name: getT('planner.pdfOpexTransport', '(-) Transport & Maint.'), amt: (inputs.monthlyTransportPackaging || 0) + (inputs.monthlyMaintenanceOther || 0), isPos: false },
    { name: getT('planner.pdfOpexEmi', '(-) Loan EMI'), amt: calculated.monthlyLoanEmi, isPos: false },
  ];

  opexItems.forEach((item, idx) => {
    const amtText = `${item.isPos ? '+' : '-'} ${formatCurrency(item.amt || 0)}`;
    const rowH = measureRowHeight([
      { text: item.name, width: opexHeadW, size: 8.5 },
      { text: amtText, width: opexAmtW, size: 8.5 },
    ]);
    checkPageBreak(rowH);
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, rowH, 'F');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    fontStyle = 'normal';
    drawTextWrapped(item.name, margin + 4, y + 4.5, opexHeadW, 'left', fontName, 8.5);
    fontStyle = 'bold';
    doc.setTextColor(item.isPos ? green[0] : slateDark[0], item.isPos ? green[1] : slateDark[1], item.isPos ? green[2] : slateDark[2]);
    drawTextWrapped(amtText, pageWidth - margin - 4, y + 4.5, opexAmtW, 'right', fontName, 8.5);
    y += rowH;
  });

  const netProfitLabel = `${getT('planner.pdfNetProfit', 'PROJECTED NET MONTHLY PROFIT (PAT):')} ${formatCurrency(calculated.monthlyNetProfit)}`;
  const marginPaybackLabel = getT('planner.pdfMarginPayback', 'Margin: {{margin}}% | Payback: {{payback}} Months').replace('{{margin}}', calculated.profitMarginPercent.toString()).replace('{{payback}}', (calculated.breakEvenMonths || getT('planner.pdfNA', 'N/A')).toString());
  const netProfitRowH = measureRowHeight([
    { text: netProfitLabel, width: 118 },
    { text: marginPaybackLabel, width: 84 },
  ], 9);
  checkPageBreak(netProfitRowH);
  doc.setFillColor(209, 250, 229);
  doc.rect(margin, y, contentWidth, netProfitRowH, 'F');
  fontStyle = 'bold';
  doc.setTextColor(green[0], green[1], green[2]);
  drawTextWrapped(netProfitLabel, margin + 4, y + 6, 118, 'left', fontName, 8.5);
  drawTextWrapped(marginPaybackLabel, pageWidth - margin - 4, y + 6, 84, 'right', fontName, 8.5);
  y += netProfitRowH + 8;

  // ─── 5. STRATEGIC AI NARRATIVE ───
  checkPageBreak(50);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  fontStyle = 'bold';
  drawTextWrapped(getT('planner.pdfNarrativeTitle', '5. Executive Strategic Summary'), margin, y, contentWidth, 'left', fontName, 11);
  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);

  fontStyle = 'normal';
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

  const summaryLines = wrapLines(narrative.executiveSummary || getT('planner.pdfDefSummary', 'Project demonstrates positive operating cash flows.'), contentWidth - 8, 8);
  const summaryBoxHeight = Math.max(16, summaryLines.length * LINE_H(8) + 8);

  checkPageBreak(summaryBoxHeight);
  doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 2, 2, 'FD');
  drawMultilineMixed(summaryLines, margin + 4, y + 5.5, 8, 'normal');
  y += summaryBoxHeight + 6;

  // Every section the model writes, not just the next steps: assumptions and
  // risks are what a loan officer reads first, and they were being dropped.
  const drawBulletSection = (title: string, items: string[] | undefined) => {
    const list = (items || []).map((s) => String(s || '').trim()).filter(Boolean);
    if (list.length === 0) return;
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    fontStyle = 'bold';
    checkPageBreak(16);
    drawTextWrapped(title, margin, y, contentWidth, 'left', fontName, 9);
    y += 5;
    fontStyle = 'normal';
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    list.forEach((item) => {
      const itemLines = wrapLines(item, contentWidth - 8, 8.5);
      const itemH = itemLines.length * LINE_H(8.5);
      checkPageBreak(itemH + 2);
      // The bullet in Helvetica, which every report can draw, with the text
      // hung beside it so wrapped lines line up under the words.
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('•', margin + 2, y);
      drawMultilineMixed(itemLines, margin + 6, y, 8.5, 'normal');
      y += itemH + 2;
    });
    y += 3;
  };

  drawBulletSection(getT('planner.keyAssumptions', 'Key Operational Assumptions'), narrative.keyAssumptions);
  drawBulletSection(getT('planner.riskAnalysis', 'Risk Analysis & Mitigation Strategy'), narrative.riskAnalysis);
  drawBulletSection(getT('planner.pdfNextSteps', 'Key Recommended Next Steps:'), narrative.actionableNextSteps);

  // ─── 6. DISCLAIMER ───
  const disclaimerTitle = getT('planner.pdfDisclaimerTitle', 'IMPORTANT DISCLAIMER:');
  const disclaimerText = getT('planner.pdfDisclaimerText', 'This project report is generated deterministically by ArthaSetu for preliminary feasibility. All figures are based on user self-reported inputs. Final sanction is subject to the lending institution’s standard due diligence.');
  const disclaimerTextLines = wrapLines(disclaimerText, contentWidth - 6, 7);
  const disclaimerBoxHeight = Math.max(18, 5 + LINE_H(8) + disclaimerTextLines.length * LINE_H(7) + 3);

  checkPageBreak(disclaimerBoxHeight + 5);
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(217, 119, 6);
  doc.roundedRect(margin, y, contentWidth, disclaimerBoxHeight, 2, 2, 'FD');

  doc.setTextColor(146, 64, 14);
  fontStyle = 'bold';
  drawTextWrapped(disclaimerTitle, margin + 3, y + 5, contentWidth - 6, 'left', fontName, 8);
  fontStyle = 'normal';
  drawMultilineMixed(disclaimerTextLines, margin + 3, y + 5 + LINE_H(8), 7, 'normal');

  y += disclaimerBoxHeight + 6;

  checkPageBreak(20);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(margin + 10, y + 10, margin + 60, y + 10);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  drawTextWrapped(getT('planner.pdfSignature', 'Applicant Signature'), margin + 22, y + 14, 40, 'left', fontName, 8);

  // Page numbers on every page, so a printed report missing a page is obvious,
  // and the guidance notice, so no single page reads as regulated advice. The
  // notice is in the report's language and drawn like the rest of its text.
  const totalPages = doc.getNumberOfPages();
  const footerNote = getT(
    'advisor.guidanceDisclaimer',
    'Guidance only, not regulated financial advice. Verify with your bank or official scheme portal.'
  );
  const footerLines = wrapLines(footerNote, contentWidth - 18, 6, fontName, 'normal').slice(0, 2);
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    footerLines.forEach((line, i) =>
      drawLineMixed(line, margin, pageHeight - 6.5 + i * LINE_H(6), 6, 'normal', 'left')
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`${page} / ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  return doc;
}

type PlanNarrative = ExportPdfOptions['narrative'];

/** Letters of each script font's script, to tell which language a text is written in. */
const SCRIPT_LETTERS: Record<string, RegExp> = {
  NotoSansDevanagari: /[ऀ-ॿ]/g,
  NotoSansBengali: /[ঀ-৿]/g,
  NotoSansOlChiki: /[᱐-᱿]/g,
  NotoSansOriya: /[଀-୿]/g,
  NotoSansTamil: /[஀-௿]/g,
  NotoSansTelugu: /[ఀ-౿]/g,
  NotoSansKannada: /[ಀ-೿]/g,
  NotoSansMalayalam: /[ഀ-ൿ]/g,
  NotoSansGujarati: /[઀-૿]/g,
  NotoSansGurmukhi: /[਀-੿]/g,
  NotoSansArabic: /[؀-ۿ]/g,
};

/** Whether a plan's narrative is written in a different script from the report's language. */
export function narrativeNeedsTranslation(text: string, language: string): boolean {
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const scriptFont = SCRIPT_FONTS.find((f) => f.langs.includes(language));
  if (!scriptFont) {
    const nonLatin = Object.values(SCRIPT_LETTERS).reduce((n, re) => n + (text.match(re) || []).length, 0);
    return nonLatin > latin;
  }
  const native = (text.match(SCRIPT_LETTERS[scriptFont.name]) || []).length;
  // Letters of English or of any other Indian script, so a Bengali plan in a
  // Hindi report is caught as well as an English one.
  const foreign = Object.entries(SCRIPT_LETTERS)
    .filter(([name]) => name !== scriptFont.name)
    .reduce((n, [, re]) => n + (text.match(re) || []).length, latin);
  return foreign > native;
}

function hashText(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

/**
 * The narrative in the report's language.
 *
 * A plan keeps the language it was generated in, so a plan made in English and
 * downloaded from the Hindi interface printed a Hindi report around a wholly
 * English summary, assumptions, risks and next steps. Translated in one request
 * when the scripts differ, cached for the session so a second download is free,
 * and left as-is if translation is unavailable (for example, quota spent).
 */
async function localizeNarrative(narrative: PlanNarrative, language: string): Promise<PlanNarrative> {
  if (typeof window === 'undefined') return narrative;
  const assumptions = narrative.keyAssumptions || [];
  const risks = narrative.riskAnalysis || [];
  const steps = narrative.actionableNextSteps || [];
  const texts = [narrative.executiveSummary || '', ...assumptions, ...risks, ...steps];
  if (!narrativeNeedsTranslation(texts.join(' '), language)) return narrative;

  const cacheKey = `arthasetu-pdf-narrative:${language}:${hashText(JSON.stringify(texts))}`;
  let translated: string[] | null = null;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) translated = JSON.parse(cached);
  } catch {
    // Storage unavailable: translate without caching.
  }

  if (!translated) {
    try {
      const res = await fetch('/api/translate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, targetLangCode: language }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.translatedTexts) && data.translatedTexts.length === texts.length) {
        translated = data.translatedTexts.map((value: unknown, i: number) =>
          typeof value === 'string' && value.trim() ? value : texts[i]
        );
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(translated));
        } catch {
          // Storage full or blocked: the translation is still used this time.
        }
      }
    } catch (err) {
      console.warn('The plan narrative could not be translated for the PDF; using the original text.', err);
    }
  }
  if (!translated || translated.length !== texts.length) return narrative;

  let index = 0;
  const take = (count: number) => translated.slice(index, (index += count));
  return {
    executiveSummary: take(1)[0],
    keyAssumptions: take(assumptions.length),
    riskAnalysis: take(risks.length),
    actionableNextSteps: take(steps.length),
  };
}

export async function downloadPlanPdf(options: ExportPdfOptions, filename = 'ArthaSetu_Project_Viability_Plan.pdf') {
  const narrative = await localizeNarrative(options.narrative, options.language || 'en');
  const doc = await generateBankReadyPlanPdf({ ...options, narrative });
  doc.save(filename);
}
