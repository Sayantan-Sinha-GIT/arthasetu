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
}

export function generateBankReadyPlanPdf({
  inputs,
  calculated,
  narrative,
  profile,
  graminScore = 720,
  graminBand = 'Strong Financial Readiness',
}: ExportPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const navy = [30, 58, 110]; // #1E3A6E
  const saffron = [217, 119, 6]; // #D97706
  const slateDark = [15, 23, 42]; // #0F172A
  const slateMuted = [71, 85, 105]; // #475569
  const green = [6, 95, 70]; // #065F46
  const borderGray = [203, 213, 225]; // #CBD5E1

  // Helper functions
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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ARTHASETU | BANK-READY PROJECT VIABILITY REPORT', margin + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Project: ${inputs.businessType.toUpperCase()} — MSME Credit & Subsidy Assessment`,
    margin + 6,
    y + 17
  );
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} | Ref: AS-${Date.now().toString().slice(-6)}`,
    margin + 6,
    y + 22
  );

  y += 32;

  // ─── 1. ENTREPRENEUR & PROJECT METADATA TABLE ───
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. Entrepreneur & Project Metadata', margin, y);
  y += 4;

  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);

  const col1 = margin + 4;
  const col2 = margin + 50;
  const col3 = margin + 105;
  const col4 = margin + 145;

  doc.text('Applicant / Entity:', col1, y + 6);
  doc.text('Operating Scale:', col1, y + 13);
  doc.text('Operating Location:', col1, y + 20);

  doc.text('Category / Gender:', col3, y + 6);
  doc.text('Plan Model:', col3, y + 13);
  doc.text('Gramin Credit Score:', col3, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

  doc.text(profile?.name || 'Registered Entrepreneur', col2, y + 6);
  doc.text(inputs.businessScale || 'Standard Operational Capacity', col2, y + 13);
  doc.text(inputs.location || 'Rural / Semi-Urban Unit', col2, y + 20);

  doc.text(
    `${profile?.gender ? profile.gender.toUpperCase() : 'INDIVIDUAL'} / GENERAL`,
    col4,
    y + 6
  );
  doc.text(
    inputs.planType === 'existing_expansion' ? 'Existing Expansion' : 'New Startup Unit',
    col4,
    y + 13
  );

  doc.setTextColor(green[0], green[1], green[2]);
  doc.text(`${graminScore} / 900 (${graminBand})`, col4, y + 20);

  y += 34;

  // ─── 2. CAPITAL OUTLAY & PROJECT COST (CAPEX) ───
  checkPageBreak(50);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. Total Project Capital Outlay (CapEx + Working Capital)', margin, y);
  y += 4;

  // Table header
  doc.setFillColor(30, 58, 110);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text('Component Item', margin + 4, y + 5);
  doc.text('Purpose / Description', margin + 80, y + 5);
  doc.text('Amount (INR)', pageWidth - margin - 26, y + 5);
  y += 7;

  const capexItems = [
    { name: 'Equipment & Machinery', desc: 'Plant machinery, primary tools & processing units', amt: inputs.equipmentCost },
    { name: 'Civil Infrastructure / Shed', desc: 'Shed civil setup, electrification & shop fixtures', amt: inputs.setupCost },
    { name: 'Initial Raw Materials / Stock', desc: 'Starting inventory / first batch material inputs', amt: inputs.initialInventory },
    { name: 'Working Capital Reserve', desc: 'Liquidity safety buffer for initial operating cycles', amt: inputs.workingCapitalReserve },
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  capexItems.forEach((item, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(item.name, margin + 4, y + 4.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(item.desc, margin + 80, y + 4.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${item.amt.toLocaleString('en-IN')}`, pageWidth - margin - 4, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 6.5;
  });

  // Total CapEx Row
  doc.setFillColor(238, 242, 255);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('TOTAL CAPITAL REQUIRED (A)', margin + 4, y + 5);
  doc.text(`Rs. ${calculated.totalInitialCost.toLocaleString('en-IN')}`, pageWidth - margin - 4, y + 5, { align: 'right' });
  y += 12;

  // ─── 3. MEANS OF FINANCE & PROPOSED DEBT STRUCTURING ───
  checkPageBreak(45);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. Means of Finance & Proposed Loan Structuring', margin, y);
  y += 4;

  doc.setFillColor(30, 58, 110);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text('Financing Source', margin + 4, y + 5);
  doc.text('Percentage of Total', margin + 80, y + 5);
  doc.text('Amount (INR)', pageWidth - margin - 26, y + 5);
  y += 7;

  const promoterEquity = inputs.availableSavings;
  const equityPercent = Math.round((promoterEquity / calculated.totalInitialCost) * 100) || 0;
  const loanPercent = Math.round((calculated.fundingGap / calculated.totalInitialCost) * 100) || 0;

  const financeItems = [
    { name: 'Promoter Equity (Own Contribution)', pct: `${equityPercent}%`, amt: promoterEquity },
    { name: 'Proposed Bank Term Loan / Mudra Gap', pct: `${loanPercent}%`, amt: calculated.fundingGap },
  ];

  financeItems.forEach((item, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(item.name, margin + 4, y + 4.5);
    doc.text(item.pct, margin + 80, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${item.amt.toLocaleString('en-IN')}`, pageWidth - margin - 4, y + 4.5, { align: 'right' });
    y += 6.5;
  });

  // Loan Summary Row
  doc.setFillColor(254, 243, 199); // amber 100
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(saffron[0], saffron[1], saffron[2]);
  doc.text(`Est. Monthly EMI (@ ${inputs.loanInterestRatePercent || 10.5}% for ${inputs.loanTenureMonths} mo):`, margin + 4, y + 5);
  doc.text(`Rs. ${calculated.monthlyLoanEmi.toLocaleString('en-IN')} / month`, pageWidth - margin - 4, y + 5, { align: 'right' });
  y += 12;

  // ─── 4. PROJECTED MONTHLY CASH FLOW & PROFITABILITY (OPEX) ───
  checkPageBreak(55);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. Projected Monthly Operating Performance & Debt Serviceability', margin, y);
  y += 4;

  doc.setFillColor(30, 58, 110);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text('Revenue / Expense Head', margin + 4, y + 5);
  doc.text('Monthly Amount (INR)', pageWidth - margin - 35, y + 5);
  y += 7;

  const opexItems = [
    { name: '(+) Projected Gross Sales / Monthly Revenue', amt: calculated.monthlyGrossRevenue, isPos: true },
    { name: '(-) Raw Material & Replenishment', amt: inputs.monthlyRawMaterials, isPos: false },
    { name: '(-) Rent, Power & Electricity Utilities', amt: inputs.monthlyRentUtilities, isPos: false },
    { name: '(-) Labor & Wages', amt: inputs.monthlyLabor, isPos: false },
    { name: '(-) Transport, Packaging & Maintenance', amt: inputs.monthlyTransportPackaging + inputs.monthlyMaintenanceOther, isPos: false },
    { name: '(-) Monthly Loan Repayment (EMI)', amt: calculated.monthlyLoanEmi, isPos: false },
  ];

  opexItems.forEach((item, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(item.name, margin + 4, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(item.isPos ? green[0] : slateDark[0], item.isPos ? green[1] : slateDark[1], item.isPos ? green[2] : slateDark[2]);
    doc.text(`${item.isPos ? '+' : '-'} Rs. ${item.amt.toLocaleString('en-IN')}`, pageWidth - margin - 4, y + 4.2, { align: 'right' });
    y += 6;
  });

  // Net Profit & Margins Box
  doc.setFillColor(209, 250, 229); // emerald 100
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(green[0], green[1], green[2]);
  doc.text(`PROJECTED NET MONTHLY PROFIT (PAT): Rs. ${calculated.monthlyNetProfit.toLocaleString('en-IN')}`, margin + 4, y + 5.5);
  doc.text(`Margin: ${calculated.profitMarginPercent}% | Payback: ${calculated.breakEvenMonths || 'N/A'} Months`, pageWidth - margin - 4, y + 5.5, { align: 'right' });
  y += 14;

  // ─── 5. STRATEGIC AI NARRATIVE & VIABILITY SUMMARY ───
  checkPageBreak(50);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('5. Executive Strategic Summary & Risk Mitigations', margin, y);
  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  
  const summaryLines = doc.splitTextToSize(narrative.executiveSummary || 'Project demonstrates positive operating cash flows with adequate debt coverage capacity.', contentWidth - 8);
  const summaryBoxHeight = Math.max(16, summaryLines.length * 4.5 + 8);
  
  doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 2, 2, 'FD');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(summaryLines, margin + 4, y + 5.5);
  y += summaryBoxHeight + 4;

  // Next Steps Bullet points
  if (narrative.actionableNextSteps && narrative.actionableNextSteps.length > 0) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Key Recommended Next Steps:', margin, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    narrative.actionableNextSteps.slice(0, 3).forEach((step) => {
      doc.text(`• ${step}`, margin + 2, y);
      y += 4;
    });
    y += 2;
  }

  // ─── 6. MANDATORY STATUTORY DISCLAIMER & SIGN-OFF ───
  checkPageBreak(35);
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(217, 119, 6);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

  doc.setTextColor(146, 64, 14); // amber 800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('IMPORTANT DISCLAIMER:', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(
    'This project report is generated deterministically by ArthaSetu for preliminary feasibility and scheme subsidy matching. All financial figures are based on user self-reported inputs and standard MSME project parameters. Final sanction is subject to the lending institution’s standard due diligence and credit appraisal policy.',
    margin + 3,
    y + 8.5,
    { maxWidth: contentWidth - 6 }
  );

  y += 22;

  // Applicant Signature
  checkPageBreak(20);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(margin + 10, y + 10, margin + 60, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Applicant Signature', margin + 22, y + 14);

  return doc;
}

export function downloadPlanPdf(options: ExportPdfOptions, filename = 'ArthaSetu_Project_Viability_Plan.pdf') {
  const doc = generateBankReadyPlanPdf(options);
  doc.save(filename);
}
