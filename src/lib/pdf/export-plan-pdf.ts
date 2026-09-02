import jsPDF from 'jspdf';
import type { PlanInputs, CalculatedValues, UserProfile } from '@/types';

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
  t?: any;
  language?: string;
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
  graminScore = 720,
  graminBand = 'Strong Financial Readiness',
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

  // Load custom fonts if needed
  if (['hi', 'mr', 'ne', 'sa', 'mai', 'doi', 'brx', 'kok'].includes(language)) {
    const b64 = await fetchFontBase64('/fonts/NotoSansDevanagari-Regular.ttf');
    if (b64) {
      doc.addFileToVFS('NotoSansDevanagari.ttf', b64);
      doc.addFont('NotoSansDevanagari.ttf', 'NotoSansDevanagari', 'normal');
      doc.addFont('NotoSansDevanagari.ttf', 'NotoSansDevanagari', 'bold');
      fontName = 'NotoSansDevanagari';
    }
  } else if (['bn', 'as', 'mni', 'sat'].includes(language)) { // Santali is stored romanized (Latin), Bengali font covers it fine too
    const b64 = await fetchFontBase64('/fonts/NotoSansBengali-Regular.ttf');
    if (b64) {
      doc.addFileToVFS('NotoSansBengali.ttf', b64);
      doc.addFont('NotoSansBengali.ttf', 'NotoSansBengali', 'normal');
      doc.addFont('NotoSansBengali.ttf', 'NotoSansBengali', 'bold');
      fontName = 'NotoSansBengali';
    }
  } else if (['or'].includes(language)) { // Odia uses its own distinct script — NOT Bengali glyphs
    const b64 = await fetchFontBase64('/fonts/NotoSansOriya-Regular.ttf');
    if (b64) {
      doc.addFileToVFS('NotoSansOriya.ttf', b64);
      doc.addFont('NotoSansOriya.ttf', 'NotoSansOriya', 'normal');
      doc.addFont('NotoSansOriya.ttf', 'NotoSansOriya', 'bold');
      fontName = 'NotoSansOriya';
    }
  } else if (['ta'].includes(language)) {
    const b64 = await fetchFontBase64('/fonts/NotoSansTamil-Regular.ttf');
    if (b64) {
      doc.addFileToVFS('NotoSansTamil.ttf', b64);
      doc.addFont('NotoSansTamil.ttf', 'NotoSansTamil', 'normal');
      doc.addFont('NotoSansTamil.ttf', 'NotoSansTamil', 'bold');
      fontName = 'NotoSansTamil';
    }
  } else if (['te'].includes(language)) {
    const b64 = await fetchFontBase64('/fonts/NotoSansTelugu-Regular.ttf');
    if (b64) {
      doc.addFileToVFS('NotoSansTelugu.ttf', b64);
      doc.addFont('NotoSansTelugu.ttf', 'NotoSansTelugu', 'normal');
      doc.addFont('NotoSansTelugu.ttf', 'NotoSansTelugu', 'bold');
      fontName = 'NotoSansTelugu';
    }
  } else if (['kn'].includes(language)) {
    const b64 = await fetchFontBase64('/fonts/NotoSansKannada-Regular.ttf');
    if (b64) {
      doc.addFileToVFS('NotoSansKannada.ttf', b64);
      doc.addFont('NotoSansKannada.ttf', 'NotoSansKannada', 'normal');
      doc.addFont('NotoSansKannada.ttf', 'NotoSansKannada', 'bold');
      fontName = 'NotoSansKannada';
    }
  } else if (['ml'].includes(language)) {
    const b64 = await fetchFontBase64('/fonts/NotoSansMalayalam-Regular.ttf');
    if (b64) {
      doc.addFileToVFS('NotoSansMalayalam.ttf', b64);
      doc.addFont('NotoSansMalayalam.ttf', 'NotoSansMalayalam', 'normal');
      doc.addFont('NotoSansMalayalam.ttf', 'NotoSansMalayalam', 'bold');
      fontName = 'NotoSansMalayalam';
    }
  } else if (['gu'].includes(language)) {
    const b64 = await fetchFontBase64('/fonts/NotoSansGujarati-Regular.ttf');
    if (b64) {
      doc.addFileToVFS('NotoSansGujarati.ttf', b64);
      doc.addFont('NotoSansGujarati.ttf', 'NotoSansGujarati', 'normal');
      doc.addFont('NotoSansGujarati.ttf', 'NotoSansGujarati', 'bold');
      fontName = 'NotoSansGujarati';
    }
  } else if (['pa'].includes(language)) {
    const b64 = await fetchFontBase64('/fonts/NotoSansGurmukhi-Regular.ttf');
    if (b64) {
      doc.addFileToVFS('NotoSansGurmukhi.ttf', b64);
      doc.addFont('NotoSansGurmukhi.ttf', 'NotoSansGurmukhi', 'normal');
      doc.addFont('NotoSansGurmukhi.ttf', 'NotoSansGurmukhi', 'bold');
      fontName = 'NotoSansGurmukhi';
    }
  } else if (['ur', 'sd', 'ks'].includes(language)) {
    const b64 = await fetchFontBase64('/fonts/NotoSansArabic-Regular.ttf');
    if (b64) {
      doc.addFileToVFS('NotoSansArabic.ttf', b64);
      doc.addFont('NotoSansArabic.ttf', 'NotoSansArabic', 'normal');
      doc.addFont('NotoSansArabic.ttf', 'NotoSansArabic', 'bold');
      fontName = 'NotoSansArabic';
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
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getT = (key: string, fallback: string) => {
    if (!t) return fallback;
    const keys = key.split('.');
    let val = t;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
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
  // effective width for non-English languages gives real headroom against
  // that mismatch. English/Latin measurement is accurate, so no shrink there.
  const WRAP_SAFETY = language === 'en' ? 1 : 0.82;
  // mm of vertical space per wrapped line at a given pt font size, with a
  // bit of extra leading over the font's natural line height as a buffer.
  const LINE_H = (size: number) => size * 0.46;

  const wrapLines = (text: string, maxWidth: number, size: number, theFontName = fontName, style = fontStyle) => {
    doc.setFont(theFontName, style);
    doc.setFontSize(size);
    return doc.splitTextToSize(text, maxWidth * WRAP_SAFETY) as string[];
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
  // Routing all ASCII to helvetica sidesteps that guesswork entirely; ₹ and
  // the script's own glyphs are non-ASCII and stay on the native font.
  const isLatinLetter = (ch: string) => ch.charCodeAt(0) < 128;

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
    splitRuns(line).reduce((sum, run) => sum + runWidth(run, size, style), 0);

  // Draws one already-wrapped line, switching fonts mid-line as needed.
  const drawLineMixed = (line: string, x: number, yPos: number, size: number, style: string, align: 'left' | 'right' | 'center') => {
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
  drawTextWrapped(getT('planner.bankReadyTitle', 'ARTHASETU | BANK-READY PROJECT REPORT'), margin + 6, y + 10, contentWidth - 12, 'left', fontName, 14);

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

  const metaRows: Array<[string, string, string, string]> = [
    [
      getT('planner.pdfApplicant', 'Applicant / Entity:'),
      profile?.name || getT('planner.pdfRegEntrepreneur', 'Registered Entrepreneur'),
      getT('planner.pdfCategoryGender', 'Category / Gender:'),
      `${profile?.gender ? profile.gender.toUpperCase() : getT('planner.pdfIndividual', 'INDIVIDUAL')} / ${getT('planner.pdfGeneral', 'GENERAL')}`,
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
      `${graminScore} / 900 (${graminBand})`,
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
  drawTextWrapped(getT('planner.stepInvestment', '2. Total Project Capital Outlay'), margin, y, contentWidth, 'left', fontName, 11);
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

  const emiLabel = getT('planner.pdfEstEmi', 'Est. Monthly EMI (@ {{rate}}% / {{mo}} mo):').replace('{{rate}}', (inputs.loanInterestRatePercent || 10.5).toString()).replace('{{mo}}', (inputs.loanTenureMonths || 60).toString());
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

  if (narrative.actionableNextSteps && narrative.actionableNextSteps.length > 0) {
    fontStyle = 'bold';
    checkPageBreak(10);
    drawTextWrapped(getT('planner.pdfNextSteps', 'Key Recommended Next Steps:'), margin, y, contentWidth, 'left', fontName, 9);
    y += 5;
    fontStyle = 'normal';
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    narrative.actionableNextSteps.slice(0, 3).forEach((step) => {
      const stepLines = wrapLines(`• ${step}`, contentWidth - 4, 8.5);
      const stepH = stepLines.length * LINE_H(8.5);
      checkPageBreak(stepH + 2);
      drawMultilineMixed(stepLines, margin + 2, y, 8.5, 'normal');
      y += stepH + 2;
    });
    y += 2;
  }

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

  return doc;
}

export async function downloadPlanPdf(options: ExportPdfOptions, filename = 'ArthaSetu_Project_Viability_Plan.pdf') {
  const doc = await generateBankReadyPlanPdf(options);
  doc.save(filename);
}
