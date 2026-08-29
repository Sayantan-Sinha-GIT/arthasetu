import type { Scheme } from '@/types';

export const SEED_SCHEMES: Scheme[] = [
  // ─── CENTRAL GOVERNMENT SCHEMES ───
  {
    id: 'central-pmegp',
    name: "Prime Minister's Employment Generation Programme (PMEGP)",
    shortName: 'PMEGP',
    category: 'Micro-Manufacturing & Services',
    governmentLevel: 'central',
    description:
      'Credit-linked subsidy programme to generate self-employment opportunities through establishment of micro-enterprises in non-farm sectors across rural and urban India.',
    targetBusinessTypes: [
      'Poultry',
      'Livestock & Poultry',
      'Manufacturing',
      'Food Processing',
      'Agro-allied',
      'Handicrafts & Handloom',
      'Retail Shop / Trade',
      'Services & Repairs',
    ],
    targetBeneficiaries: [
      'Rural Micro-Entrepreneurs',
      'Youth',
      'Women',
      'SC/ST',
      'OBC',
      'Minorities',
      'Ex-Servicemen',
    ],
    eligibility: {
      ageRange: '18+ years',
      incomeLimit: 'No ceiling on annual family income',
      businessStatus: 'new',
      otherConditions: [
        'Must have passed at least 8th standard for projects above ₹10 Lakhs in manufacturing or above ₹5 Lakhs in service',
        'Only new projects are eligible; existing units not covered under PMEGP',
      ],
    },
    benefits: {
      subsidyDetails:
        '35% subsidy on total project cost for Special Categories (Women, SC/ST, OBC, Minorities, North East/Assam, Rural areas); 25% for General category in rural areas; 15% in urban.',
      loanDetails:
        'Bank loan covers remaining 60-70% of project cost. Entrepreneur contribution is only 5% for special categories and 10% for general.',
      maxSubsidyPercent: 35,
      maxFundingAmount: 5000000,
      otherBenefits: [
        'Free 10-day Entrepreneurship Development Programme (EDP) training',
        'No collateral security required for loans up to ₹10 Lakhs',
      ],
    },
    requiredDocuments: [
      'Aadhaar Card & PAN Card',
      'Passport size photograph',
      'Project Feasibility Report / Summary',
      'Educational Qualification Certificate (8th pass or higher if project > ₹10L)',
      'Special Category Certificate (Caste/Minority/Differently-abled if applicable)',
      'Rural Area Certificate from Gram Panchayat',
      'Bank Account Passbook / Cancelled Cheque',
    ],
    applicationProcess:
      '1. Submit online application on KVIC PMEGP e-Portal (kviconline.gov.in).\n2. Select sponsoring agency (DIC, KVIC, or KVIB).\n3. Sponsoring agency verifies documents and forwards score to bank.\n4. Bank sanctions loan and claims margin money subsidy.\n5. Complete EDP training online or at local RSETI.',
    officialUrl: 'https://www.kviconline.gov.in/pmegpeportal/pmegphome/index.jsp',
    sourceName: 'Ministry of MSME / KVIC',
    lastVerifiedDate: '2026-02-15',
    isActive: true,
  },
  {
    id: 'central-mudra',
    name: 'Pradhan Mantri MUDRA Yojana (PMMY)',
    shortName: 'PM MUDRA',
    category: 'Collateral-Free Micro-Credit',
    governmentLevel: 'central',
    description:
      'Provides collateral-free institutional credit up to ₹10 Lakhs to non-corporate, non-farm small and micro enterprises for income-generating activities.',
    targetBusinessTypes: [
      'Retail Shop / Trade',
      'Services & Repairs',
      'Food Processing',
      'Handicrafts & Handloom',
      'Livestock & Poultry',
      'Dairy & Livestock Services',
      'Transportation & Logistics',
    ],
    targetBeneficiaries: [
      'Small Shopkeepers',
      'Artisans',
      'Rural Micro-Enterprises',
      'Women Entrepreneurs',
      'Youth',
    ],
    eligibility: {
      ageRange: '18-65 years',
      incomeLimit: 'No ceiling',
      businessStatus: 'both',
      otherConditions: [
        'Applicant must not be a defaulter with any commercial or cooperative bank',
        'Should possess satisfactory credit track record / CIBIL history',
      ],
    },
    benefits: {
      loanDetails:
        'Three tier loan structure:\n• Shishu: Loans up to ₹50,000 (0% margin, lowest interest)\n• Kishore: Loans from ₹50,001 up to ₹5 Lakhs\n• Tarun: Loans from ₹5 Lakhs up to ₹10 Lakhs',
      subsidyDetails: 'No direct cash subsidy; 100% collateral-free loan backed by National Credit Guarantee (NCGTC).',
      maxSubsidyPercent: 0,
      maxFundingAmount: 1000000,
      otherBenefits: [
        'Zero collateral security or third-party guarantee required',
        'Repayment tenure from 36 to 60 months with affordable interest rates (typically 8.5% - 11.5%)',
        'MUDRA Card provided for flexible working capital cash credit drawal',
      ],
    },
    requiredDocuments: [
      'Identity Proof (Aadhaar / Voter ID / Driving License)',
      'Proof of Residence / Utility Bill',
      'Business Registration / Udyam Certificate (if existing)',
      'Proof of Business address & Quotation for machinery/equipment',
      'Bank statement for last 6 months',
    ],
    applicationProcess:
      '1. Apply directly through any Commercial Bank, RRB, Small Finance Bank, or online via JanSamarth Portal (jansamarth.in) / UdyamiMitra.\n2. Submit project quotation and identity proof.\n3. Loan sanctioned within 7-14 working days upon verification.',
    officialUrl: 'https://www.mudra.org.in/',
    sourceName: 'Department of Financial Services / MUDRA Ltd',
    lastVerifiedDate: '2026-02-10',
    isActive: true,
  },
  {
    id: 'central-nlm',
    name: 'National Livestock Mission (NLM) — Poultry & Small Ruminant Entrepreneurship',
    shortName: 'NLM Poultry',
    category: 'Agro & Livestock',
    governmentLevel: 'central',
    description:
      'Capital subsidy program by the Ministry of Fisheries, Animal Husbandry & Dairying to foster entrepreneurship in rural poultry, sheep, goat, and piggery farming.',
    targetBusinessTypes: [
      'Poultry',
      'Livestock & Poultry',
      'Broiler Poultry Farm',
      'Layer Poultry Farm',
      'Goatery / Piggery',
    ],
    targetBeneficiaries: [
      'Rural Poultry Farmers',
      'Individual Entrepreneurs',
      'SHGs',
      'Farmer Producer Organisations (FPOs)',
      'JLGs',
    ],
    eligibility: {
      ageRange: '18+ years',
      incomeLimit: 'No ceiling',
      businessStatus: 'both',
      otherConditions: [
        'Entrepreneur must own or have leased land for the poultry/livestock unit',
        'Must arrange minimum 10% own equity and secure bank loan / financial closure for the balance',
      ],
    },
    benefits: {
      subsidyDetails:
        '50% Capital Subsidy up to ₹25 Lakhs for establishing Rural Backyard Poultry Mother Units / Parent Breeding Farms.',
      loanDetails: 'Bank financing covers remaining 40-50% after subsidy and entrepreneur margin.',
      maxSubsidyPercent: 50,
      maxFundingAmount: 2500000,
      otherBenefits: [
        'Subsidy released in two equal installments directly into loan account',
        'Technical training from State Animal Husbandry Department',
      ],
    },
    requiredDocuments: [
      'Land Ownership Record (Jamabandi/RoR) or registered Lease Agreement (minimum 10 years)',
      'Detailed Project Report (DPR) with cash flows',
      'Aadhaar Card & PAN Card',
      'Bank In-Principle Loan Sanction Letter',
      'Training certificate in poultry/livestock management (or undertaking)',
    ],
    applicationProcess:
      '1. Register online on the NLM Portal (nlm.udyamimitra.in).\n2. Upload DPR and land records.\n3. State Level Executive Committee (SLEC) approves proposal.\n4. Bank disburses loan and subsidy claim is forwarded to SIDBI.',
    officialUrl: 'https://nlm.udyamimitra.in/',
    sourceName: 'Ministry of Animal Husbandry & Dairying',
    lastVerifiedDate: '2026-02-01',
    isActive: true,
  },
  {
    id: 'central-pmfme',
    name: 'PM Formalisation of Micro Food Processing Enterprises (PM-FME)',
    shortName: 'PM FME',
    category: 'Food Processing & Agriculture',
    governmentLevel: 'central',
    description:
      'Financial, technical and business support for the formalisation and upgradation of micro food processing enterprises under Atmanirbhar Bharat.',
    targetBusinessTypes: [
      'Food Processing',
      'Spice Processing',
      'Oil Extraction & Milling',
      'Pickles & Preserves',
      'Bakery & Snack Units',
      'Agro-allied',
    ],
    targetBeneficiaries: [
      'Micro Food Processors',
      'SHG Members',
      'Farmer Producer Groups',
      'Individual Food Artisans',
    ],
    eligibility: {
      ageRange: '18+ years',
      incomeLimit: 'No limit',
      businessStatus: 'both',
      otherConditions: [
        'Should adopt One District One Product (ODOP) or traditional food product',
        'Enterprise must have fewer than 10 workers',
      ],
    },
    benefits: {
      subsidyDetails:
        '35% credit-linked capital subsidy on eligible project cost up to a maximum of ₹10 Lakhs.',
      loanDetails: 'Bank loan covering balance 65% with interest subvention wherever applicable.',
      maxSubsidyPercent: 35,
      maxFundingAmount: 1000000,
      otherBenefits: [
        'Free FSSAI registration and branding/packaging support',
        'Seed capital of ₹40,000 for SHG members for working capital and small tools',
      ],
    },
    requiredDocuments: [
      'Aadhaar & PAN Card',
      'Udyam Registration (or application acknowledgement)',
      'Machinery & Equipment Quotations',
      'Premises electricity bill or rental agreement',
      'Bank statement for 6 months',
    ],
    applicationProcess:
      '1. Submit online application on the PM FME portal (pmfme.mofpi.gov.in).\n2. District Resource Person (DRP) assists in DPR preparation.\n3. District Level Committee reviews and sends to bank for credit sanction.',
    officialUrl: 'https://pmfme.mofpi.gov.in/',
    sourceName: 'Ministry of Food Processing Industries (MoFPI)',
    lastVerifiedDate: '2026-01-20',
    isActive: true,
  },
  {
    id: 'central-standup',
    name: 'Stand-Up India Scheme',
    shortName: 'Stand-Up India',
    category: 'Greenfield Enterprise Financing',
    governmentLevel: 'central',
    description:
      'Bank loans between ₹10 Lakhs and ₹1 Crore to at least one Scheduled Caste (SC) or Scheduled Tribe (ST) borrower and at least one woman borrower per bank branch for setting up greenfield enterprises.',
    targetBusinessTypes: [
      'Manufacturing',
      'Food Processing',
      'Services & Repairs',
      'Livestock & Poultry',
      'Retail Shop / Trade',
    ],
    targetBeneficiaries: [
      'Women Entrepreneurs',
      'SC Entrepreneurs',
      'ST Entrepreneurs',
    ],
    eligibility: {
      ageRange: '18+ years',
      incomeLimit: 'No ceiling',
      businessStatus: 'new',
      otherConditions: [
        'Enterprise must be greenfield (first-time venture in manufacturing, services, or trading)',
        'In non-individual enterprises, 51% shareholding must be held by SC/ST or woman entrepreneur',
      ],
    },
    benefits: {
      loanDetails:
        'Composite loan (term loan + working capital) from ₹10 Lakhs to ₹1 Crore covering up to 85% of project cost.',
      subsidyDetails: 'Eligible for Central/State subsidy convergence.',
      maxSubsidyPercent: 25,
      maxFundingAmount: 10000000,
      otherBenefits: [
        'Lowest applicable interest rate for the category (Base Rate + tenor premium + max 3%)',
        'Credit guarantee cover through NCGTC',
      ],
    },
    requiredDocuments: [
      'Identity & Address Proof',
      'Caste certificate (for SC/ST) or Proof of Woman Promotership',
      'Detailed Project Report (DPR)',
      'Pollution / Local Body NOC if applicable',
      'Bank loan application in prescribed format',
    ],
    applicationProcess:
      '1. Apply online via Stand-Up Mitra Portal (standupmitra.in) or directly at any Scheduled Commercial Bank.\n2. SIDBI Handholding Agency guides in loan proposal structuring.',
    officialUrl: 'https://www.standupmitra.in/',
    sourceName: 'SIDBI / Department of Financial Services',
    lastVerifiedDate: '2026-01-15',
    isActive: true,
  },
  {
    id: 'central-svanidhi',
    name: "PM Street Vendor's AtmaNirbhar Nidhi (PM SVANidhi)",
    shortName: 'PM SVANidhi',
    category: 'Micro-Credit for Vendors',
    governmentLevel: 'central',
    description:
      'Affordable working capital micro-credit to street vendors to resume livelihoods affected by economic disruptions.',
    targetBusinessTypes: [
      'Retail Shop / Trade',
      'Street Vending & Hawkers',
      'Vegetable / Fruit Vending',
      'Small Food Stalls',
    ],
    targetBeneficiaries: [
      'Street Vendors',
      'Hawkers',
      'Rural/Urban Micro-Traders',
    ],
    eligibility: {
      ageRange: '18+ years',
      incomeLimit: 'No income ceiling',
      businessStatus: 'both',
      otherConditions: [
        'Vendor must possess Vending Certificate / ID Card from Urban Local Body (ULB) or Letter of Recommendation (LoR)',
      ],
    },
    benefits: {
      loanDetails:
        'Step-up credit model:\n• 1st tranche: ₹10,000 (1-year tenure)\n• 2nd tranche: ₹20,000 (upon timely repayment)\n• 3rd tranche: ₹50,000',
      subsidyDetails: '7% interest subsidy credited directly to bank account on timely repayment.',
      maxSubsidyPercent: 7,
      maxFundingAmount: 50000,
      otherBenefits: [
        'Monthly digital transaction cashback up to ₹100 (₹1,200 annually)',
        'No collateral or processing fees',
      ],
    },
    requiredDocuments: [
      'Aadhaar Card linked to Mobile Number',
      'Vending Certificate / Urban Local Body ID Card / Letter of Recommendation',
      'Bank Account details',
    ],
    applicationProcess:
      '1. Apply via PM SVANidhi Portal (pmsvanidhi.mohua.gov.in) or through Common Service Centre (CSC).\n2. Direct bank credit disbursement within 5-10 working days.',
    officialUrl: 'https://pmsvanidhi.mohua.gov.in/',
    sourceName: 'Ministry of Housing and Urban Affairs (MoHUA)',
    lastVerifiedDate: '2026-02-05',
    isActive: true,
  },

  // ─── ASSAM STATE SCHEMES ───
  {
    id: 'assam-cmaaa',
    name: "Chief Minister's Atmanirbhar Asom Abhijan (CMAAA)",
    shortName: 'CMAAA Assam',
    category: 'Youth & Rural Entrepreneurship',
    governmentLevel: 'state',
    state: 'Assam',
    description:
      'Flagship financial assistance scheme by the Government of Assam to empower 200,000 eligible youth and micro-entrepreneurs in agro-livestock, poultry, handloom, and service sectors.',
    targetBusinessTypes: [
      'Poultry',
      'Livestock & Poultry',
      'Broiler Poultry Farm',
      'Dairy & Livestock Services',
      'Food Processing',
      'Handicrafts & Handloom',
      'Manufacturing',
      'Services & Repairs',
    ],
    targetBeneficiaries: [
      'Permanent Residents of Assam',
      'Unemployed Rural Youth',
      'Women Entrepreneurs in Assam',
      'SHG Members',
    ],
    eligibility: {
      ageRange: '28-40 years (General) / 28-43 years (SC/ST/OBC)',
      incomeLimit: 'No ceiling',
      businessStatus: 'both',
      otherConditions: [
        'Applicant must be a permanent resident of Assam with Employment Exchange registration in Assam',
        'Should have completed minimum 10th standard for ₹2 Lakh category or Professional/Graduation for ₹5 Lakh category',
        'Applicant or family member should not be an employee of State/Central Government',
      ],
    },
    benefits: {
      subsidyDetails:
        '50% direct Government Grant (non-repayable subsidy) + 50% interest-free Government Loan:\n• Category 1: ₹2,00,000 (₹1 Lakh Grant + ₹1 Lakh 0% Loan)\n• Category 2: ₹5,00,000 (₹2.5 Lakh Grant + ₹2.5 Lakh 0% Loan)',
      loanDetails: '50% loan component is 100% interest-free with 5-year repayment tenure and 6-month moratorium.',
      maxSubsidyPercent: 50,
      maxFundingAmount: 500000,
      otherBenefits: [
        'Free 1-month hands-on skill training in chosen trade at State training institutes with stipend',
        'Zero interest on the loan component',
      ],
    },
    requiredDocuments: [
      'Assam Permanent Resident Certificate (PRC) or Voter ID',
      'Employment Exchange Registration Card in Assam',
      'Aadhaar Card & PAN Card',
      'Educational Qualification Certificate (HSLC / HS / Degree)',
      'Bank Account Passbook (Assam-based branch)',
      'Brief Concept Note on Proposed Enterprise',
    ],
    applicationProcess:
      '1. Apply online on the CMAAA Portal (cmaaa.assam.gov.in).\n2. District Level Implementation Committee screens and interviews candidates.\n3. Selected beneficiaries undergo mandatory skill training.\n4. First installment (50% grant + 50% loan) disbursed into beneficiary bank account.',
    officialUrl: 'https://cmaaa.assam.gov.in/',
    sourceName: 'Government of Assam',
    lastVerifiedDate: '2026-02-18',
    isActive: true,
  },
  {
    id: 'assam-svayem',
    name: 'Swami Vivekananda Assam Youth Empowerment Yojana (Re-SVAYEM)',
    shortName: 'Assam SVAYEM',
    category: 'Seed Grant for Youth & SHGs',
    governmentLevel: 'state',
    state: 'Assam',
    description:
      'Provides direct seed capital assistance to youth groups, joint liability groups, and individual rural entrepreneurs to set up micro-enterprises in manufacturing, livestock, and trading.',
    targetBusinessTypes: [
      'Poultry',
      'Livestock & Poultry',
      'Handicrafts & Handloom',
      'Retail Shop / Trade',
      'Food Processing',
      'Agro-allied',
    ],
    targetBeneficiaries: [
      'Rural Youth of Assam',
      'Self Help Groups (SHGs)',
      'Joint Liability Groups (JLGs)',
    ],
    eligibility: {
      ageRange: '18-40 years',
      incomeLimit: 'Family income below ₹2 Lakhs per annum preferred',
      businessStatus: 'both',
      otherConditions: [
        'Must be permanent resident of Assam',
        'Must be a member of a registered SHG/JLG or individual youth entrepreneur registered with district DIC',
      ],
    },
    benefits: {
      subsidyDetails:
        'Direct seed financial grant of ₹50,000 per member (up to ₹2.5 Lakhs for a 5-member group) released in two tranches.',
      loanDetails: 'Bank linkage assistance available for scaling up.',
      maxSubsidyPercent: 100,
      maxFundingAmount: 250000,
      otherBenefits: [
        'Non-refundable grant — not a loan, no interest or repayment required',
        'Priority raw material sourcing from Assam State Rural Livelihoods Mission (ASRLM)',
      ],
    },
    requiredDocuments: [
      'Assam PRC or Domicile proof',
      'Aadhaar Card',
      'SHG/JLG Registration copy or Individual DIC Registration',
      'Bank Passbook of Group / Individual',
      'Activity Plan for Poultry/Livestock/Trade',
    ],
    applicationProcess:
      '1. Submit physical application via Block Development Office (BDO) or online on Finance Assam portal.\n2. Verification by Gaon Panchayat and BDO committee.\n3. Direct DBT transfer into bank account.',
    officialUrl: 'https://finance.assam.gov.in/',
    sourceName: 'Finance Department, Govt of Assam',
    lastVerifiedDate: '2026-01-25',
    isActive: true,
  },

  // ─── WEST BENGAL STATE SCHEMES ───
  {
    id: 'wb-bhabishyat',
    name: 'West Bengal Bhabishyat Credit Card Scheme (WBBCCS)',
    shortName: 'WB Bhabishyat Card',
    category: 'Collateral-Free Self-Employment Loan',
    governmentLevel: 'state',
    state: 'West Bengal',
    description:
      'Flagship self-employment scheme of the Government of West Bengal providing collateral-free bank loans up to ₹5 Lakhs with government subsidy and state credit guarantee.',
    targetBusinessTypes: [
      'Manufacturing',
      'Services & Repairs',
      'Retail Shop / Trade',
      'Food Processing',
      'Livestock & Poultry',
      'Handicrafts & Handloom',
    ],
    targetBeneficiaries: [
      'Unemployed Youth in West Bengal',
      'Rural Micro-Entrepreneurs in WB',
      'Women Entrepreneurs in WB',
    ],
    eligibility: {
      ageRange: '18-45 years',
      incomeLimit: 'No strict ceiling',
      businessStatus: 'new',
      otherConditions: [
        'Must be a resident of West Bengal for at least the last 10 years',
        'Only one member from a family is eligible for assistance under the scheme',
      ],
    },
    benefits: {
      subsidyDetails:
        '10% of total project cost provided as Government Margin Money Subsidy (up to maximum ₹25,000).',
      loanDetails:
        'Bank loan covers 85% of project cost with 85% Credit Guarantee provided by Govt of West Bengal.',
      maxSubsidyPercent: 10,
      maxFundingAmount: 500000,
      otherBenefits: [
        'Entrepreneur contribution is only 5% of project cost',
        'Zero collateral security or third-party guarantor required',
      ],
    },
    requiredDocuments: [
      'Proof of 10-year residency in West Bengal (Ration card / Voter ID / Aadhaar)',
      'Detailed Project Profile',
      'Educational certificate',
      'Bank account details & PAN Card',
      'Passport size photograph',
    ],
    applicationProcess:
      '1. Apply online on the Bhabishyat Portal (bhabishyat.wb.gov.in) or submit at Duare Sarkar camps.\n2. District MSME facilitation centre vets application.\n3. Bank sanctions loan and credit card.',
    officialUrl: 'https://bhabishyat.wb.gov.in/',
    sourceName: 'MSME & Textiles Dept, Govt of West Bengal',
    lastVerifiedDate: '2026-02-12',
    isActive: true,
  },
  {
    id: 'wb-sksk',
    name: 'Swami Vivekananda Swanirbhar Karmasangsthan Prakalpa (SKSK / Atmakarma Sahayak)',
    shortName: 'WB SKSK',
    category: 'Rural Self-Employment Subsidy',
    governmentLevel: 'state',
    state: 'West Bengal',
    description:
      'Assists rural and urban youth in West Bengal to set up income-generating micro-enterprises with bank loans and government margin money subsidy.',
    targetBusinessTypes: [
      'Handicrafts & Handloom',
      'Livestock & Poultry',
      'Poultry',
      'Dairy & Livestock Services',
      'Retail Shop / Trade',
      'Food Processing',
    ],
    targetBeneficiaries: [
      'Youth & Rural Poor of West Bengal',
      'Self-Help Groups in WB',
      'Artisans & Small Farmers',
    ],
    eligibility: {
      ageRange: '18-45 years',
      incomeLimit: 'Family annual income not exceeding ₹1,50,000',
      businessStatus: 'both',
      otherConditions: [
        'Applicant must be a permanent resident of West Bengal',
        'Must not be a defaulter with any financial institution',
      ],
    },
    benefits: {
      subsidyDetails:
        '30% Government Subsidy on project cost for individual projects (up to ₹1.5 Lakhs) and 40% for SHG groups (up to ₹2.5 Lakhs).',
      loanDetails: 'Bank loan covering balance 65-70% of project cost at subsidized interest rates.',
      maxSubsidyPercent: 30,
      maxFundingAmount: 500000,
      otherBenefits: [
        'Entrepreneur contribution is only 5%',
        'Technical guidance through District Self-Help Group & Self-Employment offices',
      ],
    },
    requiredDocuments: [
      'Income Certificate from BDO / SDO',
      'Residential proof (Aadhaar / Voter ID in West Bengal)',
      'Trade license / permission copy',
      'Project proposal & equipment quotation',
      'Bank Passbook',
    ],
    applicationProcess:
      '1. Apply through local Block Development Office (BDO) or Municipality SHG department.\n2. Field inquiry and screening by Sub-Divisional Committee.\n3. Bank loan sanction and direct subsidy credit.',
    officialUrl: 'https://wb.gov.in/',
    sourceName: 'Self-Help Group & Self-Employment Dept, Govt of West Bengal',
    lastVerifiedDate: '2026-01-18',
    isActive: true,
  },

  // ─── UTTAR PRADESH STATE SCHEMES ───
  {
    id: 'up-mmysy',
    name: 'Mukhyamantri Yuva Swarojgar Yojana (MMYSY)',
    shortName: 'UP MMYSY',
    category: 'Youth Micro-Enterprise Self-Employment',
    governmentLevel: 'state',
    state: 'Uttar Pradesh',
    description:
      'Provides credit and capital subsidy to educated unemployed youth in Uttar Pradesh for setting up micro-manufacturing and service enterprises.',
    targetBusinessTypes: [
      'Manufacturing',
      'Food Processing',
      'Livestock & Poultry',
      'Agro-allied',
      'Services & Repairs',
      'Handicrafts & Handloom',
    ],
    targetBeneficiaries: [
      'Educated Unemployed Youth of UP',
      'Rural Entrepreneurs in Uttar Pradesh',
      'Women Entrepreneurs in UP',
    ],
    eligibility: {
      ageRange: '18-40 years',
      incomeLimit: 'No ceiling',
      businessStatus: 'new',
      otherConditions: [
        'Must be a permanent resident of Uttar Pradesh',
        'Educational qualification: High School (10th) passed or higher',
        'Should not have taken benefit from PMEGP or other self-employment schemes earlier',
      ],
    },
    benefits: {
      subsidyDetails:
        '25% Margin Money Subsidy on total project cost (up to maximum ₹6.25 Lakhs for Industrial units, max ₹2.5 Lakhs for Service units).',
      loanDetails:
        'Project cost up to ₹25 Lakhs for Industry sector and up to ₹10 Lakhs for Service sector supported with bank loans.',
      maxSubsidyPercent: 25,
      maxFundingAmount: 2500000,
      otherBenefits: [
        'Subsidy becomes non-repayable grant if unit operates successfully for 2 years',
        'Own contribution only 10% for General and 5% for SC/ST/OBC/Women',
      ],
    },
    requiredDocuments: [
      'UP Domicile / Niwas Praman Patra',
      'High School Marksheet / Certificate',
      'Aadhaar Card & PAN Card',
      'Detailed Project Report (DPR)',
      'Caste Certificate (if applicable)',
      'Bank Account Passbook (UP branch)',
      'Affidavit stating not a defaulter and no prior scheme benefits',
    ],
    applicationProcess:
      '1. Register online on the DIUP MSME Portal (diupmsme.upsdc.gov.in).\n2. Fill online MMYSY application form and upload DPR.\n3. District Level Task Force Committee (DLTFC) reviews and forwards to bank.\n4. Bank loan sanction and margin money deposit.',
    officialUrl: 'https://diupmsme.upsdc.gov.in/',
    sourceName: 'Department of MSME & Export Promotion, Govt of Uttar Pradesh',
    lastVerifiedDate: '2026-02-14',
    isActive: true,
  },
  {
    id: 'up-odop',
    name: 'One District One Product (ODOP) Margin Money Scheme',
    shortName: 'UP ODOP Margin Money',
    category: 'District Craft & Agro Manufacturing',
    governmentLevel: 'state',
    state: 'Uttar Pradesh',
    description:
      'Financial assistance scheme by the UP Government to promote indigenous, district-specific specialized crafts, agro-processing products, and manufacturing units across all 75 districts.',
    targetBusinessTypes: [
      'Handicrafts & Handloom',
      'Food Processing',
      'Manufacturing',
      'Agro-allied',
    ],
    targetBeneficiaries: [
      'Artisans & Craftsmen of UP',
      'Micro-Entrepreneurs in ODOP sectors',
      'Rural Producers',
    ],
    eligibility: {
      ageRange: '18+ years',
      incomeLimit: 'No ceiling',
      businessStatus: 'both',
      otherConditions: [
        'Enterprise must align with the designated ODOP product list for that specific UP district (e.g. Leather in Agra/Kanpur, Chikankari in Lucknow, Terracotta in Gorakhpur, Jaggery in Muzaffarnagar)',
        'Applicant must reside in Uttar Pradesh',
      ],
    },
    benefits: {
      subsidyDetails:
        'Tiered project margin money subsidy:\n• Projects up to ₹25 Lakhs: 25% subsidy (max ₹6.25 Lakhs)\n• Projects ₹25L to ₹50L: ₹6.25L or 20% whichever is higher\n• Projects ₹50L to ₹1 Crore: ₹10L or 10% whichever is higher',
      loanDetails: 'Bank loan covers remaining project cost with credit guarantee linkage.',
      maxSubsidyPercent: 25,
      maxFundingAmount: 5000000,
      otherBenefits: [
        'Free branding, marketing and e-commerce portal onboarding support',
        'State export facilitation support for high-quality products',
      ],
    },
    requiredDocuments: [
      'Aadhaar Card & UP Domicile proof',
      'ODOP Artisan / Entrepreneur Registration Certificate',
      'Project Feasibility Report detailing designated ODOP activity',
      'Equipment quotation and premises proof',
      'Bank Account Passbook',
    ],
    applicationProcess:
      '1. Apply online at diupmsme.upsdc.gov.in / odopup.in.\n2. District Industries Centre (DIC) verifies ODOP compliance.\n3. Bank loan sanction and direct margin money subsidy disbursement.',
    officialUrl: 'https://odopup.in/',
    sourceName: 'ODOP Cell, MSME Department, Govt of Uttar Pradesh',
    lastVerifiedDate: '2026-02-08',
    isActive: true,
  },

  // ─── MAHARASHTRA STATE SCHEMES ───
  {
    id: 'maha-cmegp',
    name: 'Chief Minister Employment Generation Programme (CMEGP Maharashtra)',
    shortName: 'Maharashtra CMEGP',
    category: 'Micro-Manufacturing & Rural Self-Employment',
    governmentLevel: 'state',
    state: 'Maharashtra',
    description:
      'Flagship self-employment programme of the Government of Maharashtra providing credit-linked capital subsidy up to 35% for establishing new micro-enterprises in manufacturing and service sectors.',
    targetBusinessTypes: [
      'Manufacturing',
      'Services & Repairs',
      'Agro-allied',
      'Food Processing',
      'Livestock & Poultry',
      'Handicrafts & Handloom',
    ],
    targetBeneficiaries: [
      'Educated Unemployed Youth of Maharashtra',
      'Rural Micro-Entrepreneurs',
      'Women Entrepreneurs in Maharashtra',
      'SC/ST/OBC/Minorities',
    ],
    eligibility: {
      ageRange: '18-45 years (General) / 18-50 years (Special Categories)',
      incomeLimit: 'No family income limit',
      businessStatus: 'new',
      otherConditions: [
        'Must be a permanent resident / domicile of Maharashtra',
        'Minimum educational qualification: 7th pass for projects up to ₹10L, 10th pass for projects above ₹10L',
        'Only new micro-enterprise projects are eligible',
      ],
    },
    benefits: {
      subsidyDetails:
        'Margin Money Subsidy on total project cost:\n• Rural areas (Special category/Women): 35% subsidy (max ₹17.5 Lakhs)\n• Rural areas (General): 25% subsidy\n• Urban areas: 15% to 25% subsidy',
      loanDetails:
        'Bank loans cover 60% to 75% of project cost. Project ceiling: ₹50 Lakhs for Manufacturing, ₹20 Lakhs for Service sector.',
      maxSubsidyPercent: 35,
      maxFundingAmount: 5000000,
      otherBenefits: [
        'Own promoter contribution is only 5% for special categories and 10% for general',
        'Compulsory residential/online EDP training provided free of cost',
      ],
    },
    requiredDocuments: [
      'Maharashtra Domicile Certificate / School Leaving Certificate',
      'Aadhaar Card & PAN Card',
      'Educational Qualification Marksheet',
      'Detailed Project Feasibility Report',
      'Caste Certificate (if claiming special category)',
      'Bank Account Passbook / Statement',
    ],
    applicationProcess:
      '1. Apply online at the Maharashtra CMEGP portal (maha-cmegp.gov.in).\n2. District Industries Centre (DIC) / KVIB screens the proposal.\n3. District Level Task Force Committee (DLTFC) interview.\n4. Bank loan sanction and margin money deposit.',
    officialUrl: 'https://maha-cmegp.gov.in/',
    sourceName: 'Directorate of Industries, Govt of Maharashtra',
    lastVerifiedDate: '2026-02-15',
    isActive: true,
  },

  // ─── BIHAR STATE SCHEMES ───
  {
    id: 'bihar-udyami',
    name: 'Mukhyamantri Udyami Yojana (Bihar Udyami Scheme)',
    shortName: 'Bihar Udyami Yojana',
    category: 'Direct Financial Assistance & 50% Subsidy',
    governmentLevel: 'state',
    state: 'Bihar',
    description:
      'Flagship financial assistance scheme by the Government of Bihar offering ₹10 Lakhs financial package (50% non-repayable grant + 50% interest-free loan) to set up new micro-manufacturing and processing enterprises.',
    targetBusinessTypes: [
      'Manufacturing',
      'Food Processing',
      'Handloom, Textiles & Tailoring',
      'Agro-allied',
      'Services & Repairs',
      'Livestock & Poultry',
    ],
    targetBeneficiaries: [
      'Permanent Residents of Bihar',
      'Youth Entrepreneurs in Bihar',
      'Women Entrepreneurs in Bihar',
      'SC / ST / EBC Beneficiaries',
    ],
    eligibility: {
      ageRange: '18-50 years',
      incomeLimit: 'No ceiling',
      businessStatus: 'new',
      otherConditions: [
        'Must be a permanent resident of Bihar (Bihar Domicile)',
        'Educational qualification: Minimum 10+2 (Intermediate), ITI, Polytechnic diploma or equivalent',
        'Unit must be registered as a Proprietorship, Partnership Firm, LLP, or Pvt Ltd company',
      ],
    },
    benefits: {
      subsidyDetails:
        'Total project assistance of ₹10 Lakhs:\n• 50% (₹5,00,000) as Direct Government Grant / Non-repayable Subsidy\n• 50% (₹5,00,000) as Interest-Free Loan (0% interest for Women/SC/ST/EBC, 1% simple interest for Youth)',
      loanDetails:
        'Loan amount of ₹5 Lakhs is repayable in 84 monthly installments (7 years) starting after a 1-year moratorium period.',
      maxSubsidyPercent: 50,
      maxFundingAmount: 1000000,
      otherBenefits: [
        '0% interest loan component for Women and SC/ST/EBC categories',
        '₹25,000 per beneficiary sanctioned for preliminary skill & entrepreneurship training',
      ],
    },
    requiredDocuments: [
      'Bihar Permanent Residence / Domicile Certificate',
      'Matric (10th) & Intermediate (10+2) Certificates for age and education proof',
      'Caste Certificate (for SC/ST/EBC)',
      'Aadhaar Card & PAN Card',
      'Current Bank Account Statement / Cancelled Cheque',
      'Signature and Passport size photograph',
    ],
    applicationProcess:
      '1. Apply online on the Bihar Udyami Portal (udyami.bihar.gov.in).\n2. Computerized computerized selection through transparent lottery / verification.\n3. 2-week mandatory training at designated nodal institutes.\n4. First installment disbursed directly into entrepreneur current account.',
    officialUrl: 'https://udyami.bihar.gov.in/',
    sourceName: 'Department of Industries, Govt of Bihar',
    lastVerifiedDate: '2026-02-20',
    isActive: true,
  },

  // ─── RAJASTHAN STATE SCHEMES ───
  {
    id: 'raj-mlupy',
    name: 'Mukhyamantri Laghu Udyog Protsahan Yojana (MLUPY)',
    shortName: 'Rajasthan MLUPY',
    category: 'Interest Subvention on Micro Loans',
    governmentLevel: 'state',
    state: 'Rajasthan',
    description:
      'Provides substantial interest subsidies on bank loans up to ₹10 Crores to encourage the establishment of new micro, small enterprises and the modernization of existing units in Rajasthan.',
    targetBusinessTypes: [
      'Manufacturing',
      'Services & Repairs',
      'Retail Shop / Trade',
      'Food Processing',
      'Handicrafts & Handloom',
      'Livestock & Poultry',
    ],
    targetBeneficiaries: [
      'Micro-Entrepreneurs in Rajasthan',
      'Youth & Rural Entrepreneurs',
      'Women Entrepreneurs in Rajasthan',
      'Small Traders & Artisans',
    ],
    eligibility: {
      ageRange: '18+ years',
      incomeLimit: 'No ceiling',
      businessStatus: 'both',
      otherConditions: [
        'Must establish the enterprise within the state of Rajasthan',
        'Available for both individual entrepreneurs and self-help groups / cooperative societies',
      ],
    },
    benefits: {
      subsidyDetails:
        'Direct Interest Subvention on bank loans for 5 years:\n• Loans up to ₹25 Lakhs: 8% per annum interest subsidy\n• Loans ₹25 Lakhs to ₹5 Crores: 6% per annum interest subsidy\n• Loans ₹5 Crores to ₹10 Crores: 5% per annum interest subsidy',
      loanDetails:
        'Loans provided through commercial banks, RRBs, Rajasthan Financial Corporation (RFC), and SIDBI.',
      maxSubsidyPercent: 8,
      maxFundingAmount: 2500000,
      otherBenefits: [
        'Covers working capital loans as well as term loans for machinery and sheds',
        'Simple online application and fast bank forwarding through SSO portal',
      ],
    },
    requiredDocuments: [
      'Rajasthan SSO ID and Aadhaar Card',
      'Detailed Project Profile / Summary',
      'Land / Premises document (Owned or Leased)',
      'Bank Account Passbook / Statement',
      'PAN Card',
    ],
    applicationProcess:
      '1. Login to Rajasthan SSO Portal (sso.rajasthan.gov.in) and select MLUPY app.\n2. Fill online application and choose preferred bank branch.\n3. District Level Task Force forwards online application to bank.\n4. Bank sanctions loan and interest subsidy is automatically credited every quarter.',
    officialUrl: 'https://sso.rajasthan.gov.in/',
    sourceName: 'Department of Industries and Commerce, Govt of Rajasthan',
    lastVerifiedDate: '2026-01-30',
    isActive: true,
  },

  // ─── KARNATAKA STATE SCHEMES ───
  {
    id: 'karn-cmegp',
    name: "Chief Minister's Self-Employment Generation Programme (CMEGP Karnataka)",
    shortName: 'Karnataka CMEGP',
    category: 'Rural Self-Employment Subsidy',
    governmentLevel: 'state',
    state: 'Karnataka',
    description:
      'Provides capital subsidy between 25% and 35% on bank-financed micro-enterprise projects in rural and semi-urban Karnataka to create sustainable self-employment for youth.',
    targetBusinessTypes: [
      'Manufacturing',
      'Services & Repairs',
      'Food Processing',
      'Agro-allied',
      'Livestock & Poultry',
      'Handloom, Textiles & Tailoring',
    ],
    targetBeneficiaries: [
      'Rural Youth of Karnataka',
      'Women Entrepreneurs in Karnataka',
      'SC/ST/OBC/Minority Beneficiaries',
      'Differently-Abled Entrepreneurs',
    ],
    eligibility: {
      ageRange: '21-35 years (General) / 21-45 years (SC/ST/OBC/Women/Minority)',
      incomeLimit: 'Family income not exceeding ₹1.5 Lakhs in rural areas, ₹2 Lakhs in urban',
      businessStatus: 'new',
      otherConditions: [
        'Must be a permanent resident of Karnataka for at least 10 years',
        'Should not have availed subsidy under any other government self-employment scheme',
      ],
    },
    benefits: {
      subsidyDetails:
        'Capital Margin Money Subsidy on total project cost:\n• Rural areas (Special category/Women): 35% subsidy (up to ₹7 Lakhs)\n• Rural areas (General): 25% subsidy\n• Urban areas: 20% to 25% subsidy',
      loanDetails:
        'Bank loans cover 75% to 85% of project cost up to maximum ₹20 Lakhs in manufacturing and ₹10 Lakhs in service sectors.',
      maxSubsidyPercent: 35,
      maxFundingAmount: 2000000,
      otherBenefits: [
        'Promoter contribution is only 5% for special categories and 10% for general',
        'EDP training provided at RUDSETI / CEDOK institutes',
      ],
    },
    requiredDocuments: [
      'Karnataka Domicile / Ration Card / Voter ID',
      'Income Certificate issued by Tahsildar',
      'Caste Certificate (if applicable)',
      'Aadhaar Card & PAN Card',
      'Detailed Project Report (DPR)',
      'Bank Account Passbook',
    ],
    applicationProcess:
      '1. Apply online on the Karnataka CMEGP portal (cmegp.kar.nic.in).\n2. Joint Director DIC / KVIB verifies documents.\n3. District Task Force Committee selects candidates.\n4. Bank sanctions loan and margin money subsidy is released by Govt.',
    officialUrl: 'https://cmegp.kar.nic.in/',
    sourceName: 'Department of Commerce and Industries, Govt of Karnataka',
    lastVerifiedDate: '2026-02-10',
    isActive: true,
  },

  // ─── TAMIL NADU STATE SCHEMES ───
  {
    id: 'tn-needs',
    name: 'New Entrepreneur-cum-Enterprise Development Scheme (NEEDS)',
    shortName: 'Tamil Nadu NEEDS',
    category: 'Capital Subsidy for First-Generation Youth',
    governmentLevel: 'state',
    state: 'Tamil Nadu',
    description:
      'Flagship entrepreneurship scheme of the Government of Tamil Nadu providing 25% capital subsidy and 3% interest subvention for first-generation educated youth to establish manufacturing and service micro-enterprises.',
    targetBusinessTypes: [
      'Manufacturing',
      'Services & Repairs',
      'Food Processing',
      'Agro-allied',
      'Handloom, Textiles & Tailoring',
    ],
    targetBeneficiaries: [
      'Educated First-Generation Entrepreneurs in Tamil Nadu',
      'Graduates / Diploma / ITI Holders in TN',
      'Women Entrepreneurs in TN',
    ],
    eligibility: {
      ageRange: '21-35 years (General) / 21-45 years (SC/ST/BC/MBC/Women/Ex-Servicemen)',
      incomeLimit: 'No ceiling',
      businessStatus: 'new',
      otherConditions: [
        'Must be a resident of Tamil Nadu for minimum 3 years',
        'Educational qualification: Degree, Diploma, ITI, or Vocational training passed',
        'Must be a first-generation entrepreneur (no family-owned business in same sector)',
      ],
    },
    benefits: {
      subsidyDetails:
        '25% State Capital Subsidy on total project cost (up to maximum ₹75 Lakhs) + 3% Interest Subvention for entire repayment period.',
      loanDetails:
        'Bank / TIIC term loan covering project costs between ₹10 Lakhs and ₹5 Crores.',
      maxSubsidyPercent: 25,
      maxFundingAmount: 50000000,
      otherBenefits: [
        'Own promoter contribution is only 5% for special categories and 10% for general',
        'Compulsory 1-month Entrepreneurship Development Programme (EDP) training by EDI Chennai',
      ],
    },
    requiredDocuments: [
      'Tamil Nadu Nativity / Residence Certificate',
      'Degree / Diploma / ITI Certificate',
      'First Generation Entrepreneur Certificate from Revenue Department',
      'Detailed Project Profile with machinery quotations',
      'Aadhaar Card & PAN Card',
      'Bank Account details',
    ],
    applicationProcess:
      '1. Submit online application on msmeonline.tn.gov.in portal.\n2. District Industries Centre (DIC) scrutiny and interview by District Task Force.\n3. Bank sanction and EDP training at Entrepreneurship Development Institute (EDII).\n4. Subsidy disbursement.',
    officialUrl: 'https://msmeonline.tn.gov.in/needs/',
    sourceName: 'Department of MSME, Govt of Tamil Nadu',
    lastVerifiedDate: '2026-02-01',
    isActive: true,
  },

  // ─── MADHYA PRADESH STATE SCHEMES ───
  {
    id: 'mp-mmuky',
    name: 'Mukhyamantri Udyam Kranti Yojana (MMUKY)',
    shortName: 'MP Udyam Kranti',
    category: 'Collateral-Free Loan with 3% Interest Subsidy',
    governmentLevel: 'state',
    state: 'Madhya Pradesh',
    description:
      'Provides 100% government collateral guarantee and a 3% annual interest subsidy on bank loans for youth in Madhya Pradesh to set up manufacturing, service, or retail enterprises.',
    targetBusinessTypes: [
      'Manufacturing',
      'Services & Repairs',
      'Retail Shop / Trade',
      'Food Processing',
      'Livestock & Poultry',
      'Agro-allied',
    ],
    targetBeneficiaries: [
      'Youth of Madhya Pradesh',
      'Rural Micro-Entrepreneurs in MP',
      'Women Entrepreneurs in MP',
    ],
    eligibility: {
      ageRange: '18-45 years',
      incomeLimit: 'Family annual income not exceeding ₹12 Lakhs',
      businessStatus: 'new',
      otherConditions: [
        'Must be a permanent resident / domicile of Madhya Pradesh',
        'Minimum educational qualification: 8th standard passed',
        'Should not be a defaulter with any financial institution or bank',
      ],
    },
    benefits: {
      subsidyDetails:
        '3% Interest Subvention per annum on bank loan for up to 7 years + 100% reimbursement of loan guarantee fee (CGTMSE).',
      loanDetails:
        'Bank loans up to ₹50 Lakhs for Manufacturing units and up to ₹25 Lakhs for Service / Retail Business units.',
      maxSubsidyPercent: 3,
      maxFundingAmount: 5000000,
      otherBenefits: [
        'Completely collateral-free loan backed by State Government Guarantee',
        'Reimbursement of guarantee fees directly by MP Government',
      ],
    },
    requiredDocuments: [
      'MP Domicile / Mool Niwas Praman Patra',
      '8th or 10th Marksheet / Passing Certificate',
      'Aadhaar Card, Samagra ID, and PAN Card',
      'Income Certificate (or ITR)',
      'Detailed Project Profile',
      'Bank Account Passbook (MP branch)',
    ],
    applicationProcess:
      '1. Apply online through MP Samast Portal (samast.mponline.gov.in).\n2. DIC verifies application and forwards to applicant selected bank branch.\n3. Bank processes and sanctions loan without collateral.\n4. Interest subsidy credited annually to loan account.',
    officialUrl: 'https://samast.mponline.gov.in/',
    sourceName: 'MSME Department, Govt of Madhya Pradesh',
    lastVerifiedDate: '2026-02-16',
    isActive: true,
  },

  // ─── GUJARAT STATE SCHEMES ───
  {
    id: 'guj-vbgs',
    name: 'Shri Vajpayee Bankable Yojana (VBGS)',
    shortName: 'Gujarat VBGS',
    category: 'Cottage & Rural Enterprise Subsidy',
    governmentLevel: 'state',
    state: 'Gujarat',
    description:
      'Financial assistance scheme by Gujarat Cottage and Rural Industries Department to generate self-employment for urban and rural unemployed youth, artisans, and micro-entrepreneurs.',
    targetBusinessTypes: [
      'Handicrafts & Handloom',
      'Manufacturing',
      'Services & Repairs',
      'Retail Shop / Trade',
      'Food Processing',
    ],
    targetBeneficiaries: [
      'Artisans & Craftsmen in Gujarat',
      'Rural & Urban Unemployed Youth in Gujarat',
      'Women Entrepreneurs in Gujarat',
      'Differently-Abled Individuals',
    ],
    eligibility: {
      ageRange: '18-65 years',
      incomeLimit: 'No family income limit',
      businessStatus: 'both',
      otherConditions: [
        'Must be a resident of Gujarat',
        'Minimum education: 10th pass for Industrial projects; none required for traditional artisan trades',
      ],
    },
    benefits: {
      subsidyDetails:
        'Government Margin Money Subsidy:\n• Rural areas (Women/SC/ST/Handicapped): 37.5% subsidy (up to ₹1.25 Lakhs)\n• Rural areas (General): 25% subsidy (up to ₹1.00 Lakh)\n• Urban areas: 20% to 30% subsidy',
      loanDetails:
        'Maximum project cost supported: ₹8 Lakhs for Industry/Manufacturing sector, ₹8 Lakhs for Service, and ₹4 Lakhs for Retail Business.',
      maxSubsidyPercent: 37.5,
      maxFundingAmount: 800000,
      otherBenefits: [
        'No collateral required for loans up to ₹8 Lakhs',
        'Includes financial assistance for equipment and raw material stock',
      ],
    },
    requiredDocuments: [
      'Gujarat Domicile / Ration Card / Election Card',
      'Aadhaar Card & PAN Card',
      'Birth Certificate or School Leaving Certificate for age proof',
      'Educational / Technical training certificate (if applicable)',
      'Quotation for Machinery / Equipment from registered dealer',
      'Bank Account Passbook',
    ],
    applicationProcess:
      '1. Apply online on the e-Kutir Portal (ekutir.gujarat.gov.in).\n2. Scrutiny by District Cottage Industries Officer.\n3. Sponsor application to bank for loan sanction and subsidy release.',
    officialUrl: 'https://ekutir.gujarat.gov.in/',
    sourceName: 'Cottage and Rural Industries Dept, Govt of Gujarat',
    lastVerifiedDate: '2026-02-05',
    isActive: true,
  },

  // ─── ODISHA STATE SCHEMES ───
  {
    id: 'odisha-mkuy',
    name: 'Mukhyamantri Krushi Udyog Yojana (MKUY Odisha)',
    shortName: 'Odisha MKUY',
    category: 'Commercial Agri & Livestock Enterprise Subsidy',
    governmentLevel: 'state',
    state: 'Odisha',
    description:
      'Flagship scheme of the Government of Odisha providing capital investment subsidy up to 50% for setting up commercial agri-enterprises including poultry farms, dairy units, and agro-processing plants.',
    targetBusinessTypes: [
      'Poultry',
      'Livestock & Poultry',
      'Dairy & Livestock Services',
      'Food Processing',
      'Agro-allied',
      'Agriculture & Allied',
    ],
    targetBeneficiaries: [
      'Farmers & Agri-Entrepreneurs of Odisha',
      'Poultry & Dairy Farmers in Odisha',
      'Women Entrepreneurs in Odisha',
      'Agriculture Graduates / Diploma Holders',
    ],
    eligibility: {
      ageRange: '18+ years',
      incomeLimit: 'No ceiling',
      businessStatus: 'both',
      otherConditions: [
        'Must be a permanent resident of Odisha',
        'Must possess land suitable for the agro-livestock unit (own land or leased for minimum 15 years)',
      ],
    },
    benefits: {
      subsidyDetails:
        'Capital Investment Subsidy (CIS):\n• 50% subsidy (up to ₹50 Lakhs) for Women, SC/ST, and Graduates in Agriculture & Allied subjects\n• 40% subsidy (up to ₹50 Lakhs) for General Category entrepreneurs',
      loanDetails:
        'Bank loan covers remaining project cost with credit guarantee linkage.',
      maxSubsidyPercent: 50,
      maxFundingAmount: 5000000,
      otherBenefits: [
        'Subsidy released directly in back-ended mode to bank account upon stage-wise physical verification',
        'Technical guidance from APICOL (Agricultural Promotion and Investment Corporation of Odisha)',
      ],
    },
    requiredDocuments: [
      'Odisha Resident / Land Record (RoR) / Valid Lease Deed',
      'Aadhaar Card & PAN Card',
      'Detailed Project Report (DPR)',
      'Educational Certificate (special subsidy for Agriculture graduates)',
      'Bank Account Passbook / Bank consent letter',
    ],
    applicationProcess:
      '1. Register online on the GO-SUGATHA Portal (sugam.odisha.gov.in / agrinetodisha.nic.in).\n2. Submit DPR and select financing bank.\n3. District Nodal Officer / APICOL conducts feasibility inspection.\n4. Bank loan sanction and stage-wise subsidy disbursement.',
    officialUrl: 'https://agrinetodisha.nic.in/',
    sourceName: 'Department of Agriculture & Farmers Empowerment, Govt of Odisha',
    lastVerifiedDate: '2026-02-12',
    isActive: true,
  },

  // ─── KERALA STATE SCHEMES ───
  {
    id: 'kerala-ess',
    name: 'Entrepreneur Support Scheme (ESS Kerala)',
    shortName: 'Kerala ESS',
    category: 'Investment & Technology Subsidy',
    governmentLevel: 'state',
    state: 'Kerala',
    description:
      'Provides comprehensive financial assistance including investment subsidy, technology support, and margin money assistance for setting up and modernizing micro and small manufacturing units in Kerala.',
    targetBusinessTypes: [
      'Manufacturing',
      'Food Processing',
      'Handicrafts & Handloom',
      'Agro-allied',
      'Services & Repairs',
    ],
    targetBeneficiaries: [
      'Micro & Small Entrepreneurs in Kerala',
      'Women Entrepreneurs in Kerala',
      'NRI Returnees establishing businesses in Kerala',
      'SC/ST and Young Entrepreneurs',
    ],
    eligibility: {
      ageRange: '18+ years',
      incomeLimit: 'No ceiling',
      businessStatus: 'both',
      otherConditions: [
        'Enterprise must be established within the State of Kerala',
        'Must obtain Udyam Registration and valid local body permits',
      ],
    },
    benefits: {
      subsidyDetails:
        'Investment Subsidy on Fixed Capital:\n• 15% to 25% for general manufacturing units (up to ₹30 Lakhs)\n• 40% for Women, SC/ST, and Young Entrepreneurs (up to ₹45 Lakhs)\n• 50% for Agro-processing and Food industries (up to ₹1 Crore in thrust sectors)',
      loanDetails:
        'Term loan and working capital linkage through Kerala Financial Corporation (KFC) or scheduled banks.',
      maxSubsidyPercent: 50,
      maxFundingAmount: 10000000,
      otherBenefits: [
        'Special incentives for clean and green technologies',
        'Stamp duty and registration fee exemptions for new industrial land purchases',
      ],
    },
    requiredDocuments: [
      'Udyam Registration Certificate & Kerala Domicile proof',
      'Detailed Project Report and machinery invoices',
      'Building tax receipt / Lease agreement',
      'Bank Sanction Letter and Account Statement',
      'PAN Card & Aadhaar Card',
    ],
    applicationProcess:
      '1. Apply online on the Kerala Industries Single Window Portal (schemes.industry.kerala.gov.in).\n2. General Manager DIC verifies fixed asset investments.\n3. State Level Committee sanctions subsidy.\n4. Direct credit into bank loan account.',
    officialUrl: 'https://schemes.industry.kerala.gov.in/',
    sourceName: 'Directorate of Industries and Commerce, Govt of Kerala',
    lastVerifiedDate: '2026-02-19',
    isActive: true,
  },

  // ─── DELHI UT SCHEMES ───
  {
    id: 'delhi-dsiidc',
    name: 'Delhi Micro Enterprise Credit & Financial Assistance Scheme',
    shortName: 'Delhi Micro Credit Scheme',
    category: 'Urban Micro-Enterprise Support',
    governmentLevel: 'state',
    state: 'Delhi',
    description:
      'Credit facilitation and margin money subsidy programme for urban micro-enterprises, small service shops, food businesses, and artisan manufacturing units across the National Capital Territory of Delhi.',
    targetBusinessTypes: [
      'Manufacturing',
      'Services & Repairs',
      'Retail Shop / Trade',
      'Food Processing',
      'Handloom, Textiles & Tailoring',
    ],
    targetBeneficiaries: [
      'Micro-Entrepreneurs in Delhi NCT',
      'Women & Youth in Delhi',
      'Urban Artisans & Craftsmen',
    ],
    eligibility: {
      ageRange: '18-50 years',
      incomeLimit: 'No ceiling',
      businessStatus: 'both',
      otherConditions: [
        'Must be a resident of National Capital Territory of Delhi (Voter ID / Domicile in Delhi)',
        'Enterprise premises located within authorized commercial, conforming, or household industrial zones in Delhi',
      ],
    },
    benefits: {
      subsidyDetails:
        '15% Margin Money Subsidy on project cost (up to ₹1.5 Lakhs) + 5% Interest Subsidy on timely loan repayments.',
      loanDetails:
        'Collateral-free bank loan coverage up to ₹10 Lakhs through nationalized banks with CGTMSE backing.',
      maxSubsidyPercent: 15,
      maxFundingAmount: 1000000,
      otherBenefits: [
        'Simplified single-window clearance through Delhi MSME cell',
        'Skill training and digital payment onboarding support',
      ],
    },
    requiredDocuments: [
      'Delhi Voter ID Card / Electricity Bill in applicant name',
      'Aadhaar Card & PAN Card',
      'Premises proof (Rent Agreement / Electricity connection in conforming zone)',
      'Brief Project Proposal & Equipment quotation',
      'Bank Account Passbook',
    ],
    applicationProcess:
      '1. Submit application online at Delhi Industries Portal (industries.delhi.gov.in).\n2. Joint inspection by DSIIDC / MSME field officer.\n3. Bank sanction and direct DBT subsidy credit.',
    officialUrl: 'https://industries.delhi.gov.in/',
    sourceName: 'Department of Industries, Govt of NCT of Delhi',
    lastVerifiedDate: '2026-02-14',
    isActive: true,
  },
];

