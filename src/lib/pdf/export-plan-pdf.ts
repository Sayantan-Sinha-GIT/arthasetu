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
  } else if (['bn', 'as', 'mni'].includes(language)) {
    const b64 = await fetchFontBase64('/fonts/NotoSansBengali-Regular.ttf');
    if (b64) {
      doc.addFileToVFS('NotoSansBengali.ttf', b64);
      doc.addFont('NotoSansBengali.ttf', 'NotoSansBengali', 'normal');
      doc.addFont('NotoSansBengali.ttf', 'NotoSansBengali', 'bold');
      fontName = 'NotoSansBengali';
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
    return new Intl.NumberFormat(language === 'en' ? 'en-IN' : language, {
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

  const drawTextWrapped = (text: string, x: number, currentY: number, maxWidth: number, align = 'left', theFontName = fontName, size = 8.5) => {
    doc.setFont(theFontName, fontStyle);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, currentY, { align: align as any });
    return lines.length * (size * 0.4); // approx height
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
  drawTextWrapped(`Project: ${inputs.businessType.toUpperCase()} — MSME Credit & Subsidy Assessment`, margin + 6, y + 17, contentWidth - 12, 'left', fontName, 9);
  
  drawTextWrapped(
    `Generated: ${new Date().toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })} | Ref: AS-${Date.now().toString().slice(-6)}`,
    margin + 6,
    y + 22,
    contentWidth - 12, 'left', fontName, 8
  );

  y += 32;

  // ─── 1. ENTREPRENEUR & PROJECT METADATA TABLE ───
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  fontStyle = 'bold';
  drawTextWrapped('1. Entrepreneur & Project Metadata', margin, y, contentWidth, 'left', fontName, 11);
  y += 4;

  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

  const col1 = margin + 4;
  const col2 = margin + 45; // adjusted for width
  const col3 = margin + 100;
  const col4 = margin + 140;

  fontStyle = 'normal';
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  drawTextWrapped('Applicant / Entity:', col1, y + 6, col2 - col1 - 2, 'left', fontName, 8);
  drawTextWrapped('Operating Scale:', col1, y + 13, col2 - col1 - 2, 'left', fontName, 8);
  drawTextWrapped('Operating Location:', col1, y + 20, col2 - col1 - 2, 'left', fontName, 8);

  drawTextWrapped('Category / Gender:', col3, y + 6, col4 - col3 - 2, 'left', fontName, 8);
  drawTextWrapped('Plan Model:', col3, y + 13, col4 - col3 - 2, 'left', fontName, 8);
  drawTextWrapped('Gramin Credit Score:', col3, y + 20, col4 - col3 - 2, 'left', fontName, 8);

  fontStyle = 'bold';
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

  drawTextWrapped(profile?.name || 'Registered Entrepreneur', col2, y + 6, col3 - col2 - 2, 'left', fontName, 8.5);
  drawTextWrapped(inputs.businessScale || 'Standard Operational Capacity', col2, y + 13, col3 - col2 - 2, 'left', fontName, 8.5);
  drawTextWrapped(inputs.location || 'Rural / Semi-Urban Unit', col2, y + 20, col3 - col2 - 2, 'left', fontName, 8.5);

  drawTextWrapped(`${profile?.gender ? profile.gender.toUpperCase() : 'INDIVIDUAL'} / GENERAL`, col4, y + 6, pageWidth - col4 - margin, 'left', fontName, 8.5);
  drawTextWrapped(inputs.planType === 'existing_expansion' ? 'Existing Expansion' : 'New Startup Unit', col4, y + 13, pageWidth - col4 - margin, 'left', fontName, 8.5);

  doc.setTextColor(green[0], green[1], green[2]);
  drawTextWrapped(`${graminScore} / 900 (${graminBand})`, col4, y + 20, pageWidth - col4 - margin, 'left', fontName, 8.5);

  y += 34;

  // ─── 2. CAPITAL OUTLAY & PROJECT COST (CAPEX) ───
  checkPageBreak(50);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  fontStyle = 'bold';
  drawTextWrapped(getT('planner.stepInvestment', '2. Total Project Capital Outlay'), margin, y, contentWidth, 'left', fontName, 11);
  y += 4;

  doc.setFillColor(30, 58, 110);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  fontStyle = 'bold';
  drawTextWrapped('Component Item', margin + 4, y + 5, 70, 'left', fontName, 8.5);
  drawTextWrapped('Purpose / Description', margin + 74, y + 5, 80, 'left', fontName, 8.5);
  drawTextWrapped('Amount', pageWidth - margin - 4, y + 5, 30, 'right', fontName, 8.5);
  y += 7;

  const capexItems = [
    { name: 'Equipment & Machinery', desc: 'Plant machinery, primary tools', amt: inputs.equipmentCost },
    { name: 'Civil Infrastructure / Shed', desc: 'Shed civil setup, electrification', amt: inputs.setupCost },
    { name: 'Initial Raw Materials / Stock', desc: 'Starting inventory / first batch', amt: inputs.initialInventory },
    { name: 'Working Capital Reserve', desc: 'Liquidity safety buffer', amt: inputs.workingCapitalReserve },
  ];

  capexItems.forEach((item, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    fontStyle = 'normal';
    drawTextWrapped(item.name, margin + 4, y + 5, 68, 'left', fontName, 8);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    drawTextWrapped(item.desc, margin + 74, y + 5, 78, 'left', fontName, 8);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    fontStyle = 'bold';
    drawTextWrapped(formatCurrency(item.amt || 0), pageWidth - margin - 4, y + 5, 40, 'right', fontName, 8.5);
    y += 8;
  });

  doc.setFillColor(238, 242, 255);
  doc.rect(margin, y, contentWidth, 8, 'F');
  fontStyle = 'bold';
  doc.setTextColor(navy[0], navy[1], navy[2]);
  drawTextWrapped(getT('planner.totalInvestment', 'TOTAL CAPITAL REQUIRED (A)'), margin + 4, y + 5.5, 100, 'left', fontName, 8.5);
  drawTextWrapped(formatCurrency(calculated.totalInitialCost), pageWidth - margin - 4, y + 5.5, 40, 'right', fontName, 9);
  y += 12;

  // ─── 3. MEANS OF FINANCE ───
  checkPageBreak(45);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  fontStyle = 'bold';
  drawTextWrapped('3. Means of Finance & Proposed Loan Structuring', margin, y, contentWidth, 'left', fontName, 11);
  y += 4;

  doc.setFillColor(30, 58, 110);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  drawTextWrapped('Financing Source', margin + 4, y + 5, 70, 'left', fontName, 8.5);
  drawTextWrapped('Percentage', margin + 74, y + 5, 30, 'left', fontName, 8.5);
  drawTextWrapped('Amount', pageWidth - margin - 4, y + 5, 40, 'right', fontName, 8.5);
  y += 7;

  const promoterEquity = inputs.availableSavings;
  const equityPercent = Math.round((promoterEquity / calculated.totalInitialCost) * 100) || 0;
  const loanPercent = Math.round((calculated.fundingGap / calculated.totalInitialCost) * 100) || 0;

  const financeItems = [
    { name: 'Promoter Equity', pct: `${equityPercent}%`, amt: promoterEquity },
    { name: 'Proposed Bank Term Loan', pct: `${loanPercent}%`, amt: calculated.fundingGap },
  ];

  financeItems.forEach((item, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    fontStyle = 'normal';
    drawTextWrapped(item.name, margin + 4, y + 5, 68, 'left', fontName, 8);
    drawTextWrapped(item.pct, margin + 74, y + 5, 30, 'left', fontName, 8);
    fontStyle = 'bold';
    drawTextWrapped(formatCurrency(item.amt || 0), pageWidth - margin - 4, y + 5, 40, 'right', fontName, 8.5);
    y += 8;
  });

  doc.setFillColor(254, 243, 199);
  doc.rect(margin, y, contentWidth, 8, 'F');
  fontStyle = 'bold';
  doc.setTextColor(saffron[0], saffron[1], saffron[2]);
  drawTextWrapped(`Est. Monthly EMI (@ ${inputs.loanInterestRatePercent || 10.5}% / ${inputs.loanTenureMonths} mo):`, margin + 4, y + 5.5, 120, 'left', fontName, 8.5);
  drawTextWrapped(`${formatCurrency(calculated.monthlyLoanEmi)} / mo`, pageWidth - margin - 4, y + 5.5, 50, 'right', fontName, 8.5);
  y += 12;

  // ─── 4. PROJECTED MONTHLY CASH FLOW (OPEX) ───
  checkPageBreak(55);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  fontStyle = 'bold';
  drawTextWrapped('4. Projected Monthly Operating Performance', margin, y, contentWidth, 'left', fontName, 11);
  y += 4;

  doc.setFillColor(30, 58, 110);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  drawTextWrapped('Revenue / Expense Head', margin + 4, y + 5, 120, 'left', fontName, 8.5);
  drawTextWrapped('Monthly Amount', pageWidth - margin - 4, y + 5, 40, 'right', fontName, 8.5);
  y += 7;

  const opexItems = [
    { name: '(+) Projected Gross Sales', amt: calculated.monthlyGrossRevenue, isPos: true },
    { name: '(-) Raw Material', amt: inputs.monthlyRawMaterials, isPos: false },
    { name: '(-) Rent & Utilities', amt: inputs.monthlyRentUtilities, isPos: false },
    { name: '(-) Labor & Wages', amt: inputs.monthlyLabor, isPos: false },
    { name: '(-) Transport & Maint.', amt: (inputs.monthlyTransportPackaging || 0) + (inputs.monthlyMaintenanceOther || 0), isPos: false },
    { name: '(-) Loan EMI', amt: calculated.monthlyLoanEmi, isPos: false },
  ];

  opexItems.forEach((item, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    fontStyle = 'normal';
    drawTextWrapped(item.name, margin + 4, y + 4.5, 120, 'left', fontName, 8.5);
    fontStyle = 'bold';
    doc.setTextColor(item.isPos ? green[0] : slateDark[0], item.isPos ? green[1] : slateDark[1], item.isPos ? green[2] : slateDark[2]);
    drawTextWrapped(`${item.isPos ? '+' : '-'} ${formatCurrency(item.amt || 0)}`, pageWidth - margin - 4, y + 4.5, 40, 'right', fontName, 8.5);
    y += 7;
  });

  doc.setFillColor(209, 250, 229);
  doc.rect(margin, y, contentWidth, 9, 'F');
  fontStyle = 'bold';
  doc.setTextColor(green[0], green[1], green[2]);
  drawTextWrapped(`PROJECTED NET MONTHLY PROFIT (PAT): ${formatCurrency(calculated.monthlyNetProfit)}`, margin + 4, y + 6, 120, 'left', fontName, 8.5);
  drawTextWrapped(`Margin: ${calculated.profitMarginPercent}% | Payback: ${calculated.breakEvenMonths || 'N/A'} Months`, pageWidth - margin - 4, y + 6, 80, 'right', fontName, 8.5);
  y += 15;

  // ─── 5. STRATEGIC AI NARRATIVE ───
  checkPageBreak(50);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  fontStyle = 'bold';
  drawTextWrapped('5. Executive Strategic Summary', margin, y, contentWidth, 'left', fontName, 11);
  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  
  fontStyle = 'normal';
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  
  // Calculate text height before drawing rect
  doc.setFont(fontName, fontStyle);
  doc.setFontSize(8);
  const summaryLines = doc.splitTextToSize(narrative.executiveSummary || 'Project demonstrates positive operating cash flows.', contentWidth - 8);
  const summaryBoxHeight = Math.max(16, summaryLines.length * 4.5 + 8);
  
  doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 2, 2, 'FD');
  doc.text(summaryLines, margin + 4, y + 5.5);
  y += summaryBoxHeight + 6;

  if (narrative.actionableNextSteps && narrative.actionableNextSteps.length > 0) {
    checkPageBreak(30);
    fontStyle = 'bold';
    drawTextWrapped('Key Recommended Next Steps:', margin, y, contentWidth, 'left', fontName, 9);
    y += 5;
    fontStyle = 'normal';
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    narrative.actionableNextSteps.slice(0, 3).forEach((step) => {
      const stepH = drawTextWrapped(`• ${step}`, margin + 2, y, contentWidth - 4, 'left', fontName, 8.5);
      y += stepH + 2;
    });
    y += 2;
  }

  // ─── 6. DISCLAIMER ───
  checkPageBreak(35);
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(217, 119, 6);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setTextColor(146, 64, 14);
  fontStyle = 'bold';
  drawTextWrapped('IMPORTANT DISCLAIMER:', margin + 3, y + 5, contentWidth - 6, 'left', fontName, 8);
  fontStyle = 'normal';
  drawTextWrapped(
    'This project report is generated deterministically by ArthaSetu for preliminary feasibility. All figures are based on user self-reported inputs. Final sanction is subject to the lending institution’s standard due diligence.',
    margin + 3, y + 9.5, contentWidth - 6, 'left', fontName, 7
  );

  y += 24;

  checkPageBreak(20);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(margin + 10, y + 10, margin + 60, y + 10);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  drawTextWrapped('Applicant Signature', margin + 22, y + 14, 40, 'left', fontName, 8);

  return doc;
}

export async function downloadPlanPdf(options: ExportPdfOptions, filename = 'ArthaSetu_Project_Viability_Plan.pdf') {
  const doc = await generateBankReadyPlanPdf(options);
  doc.save(filename);
}
