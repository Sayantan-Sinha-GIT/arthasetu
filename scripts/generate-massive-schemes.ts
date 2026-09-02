import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
// Using 3.5-flash-lite as it's great for high-volume JSON tasks and very fast
const model = genAI.getGenerativeModel({ 
  model: 'gemini-3.5-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
  }
});

const TARGET_STATES = [
  "Central Government (Nationwide)",
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir"
];

const BATCH_SIZE = 15; // Schemes per state/category

const SCHEMA = `Array of objects, where each object matches this TypeScript interface exactly:
export interface Scheme {
  name: string;
  shortName: string;
  category: "Agro & Livestock" | "Micro-Credit" | "Manufacturing" | "Youth Self-Employment" | "Women Entrepreneurship" | "Weavers & Artisans" | "Retail & Services" | "Technology & Innovation";
  governmentLevel: 'central' | 'state';
  state?: string; // Must be omitted or null for central. For state level, must be the exact state name provided.
  description: string;
  targetBusinessTypes: string[];
  targetBeneficiaries: string[];

  eligibility: {
    ageRange?: string; // e.g. "18-45 years"
    incomeLimit?: string;
    education?: string;
    businessStatus?: 'new' | 'existing' | 'both';
    otherConditions: string[];
  };

  benefits: {
    loanDetails?: string;
    subsidyDetails?: string;
    maxSubsidyPercent?: number; // e.g. 35
    maxFundingAmount?: number; // e.g. 2500000
    otherBenefits: string[];
  };

  requiredDocuments: string[];
  applicationProcess: string;
  officialUrl: string; // real url if possible, or a highly probable placeholder like "https://msme.gov.in"
  sourceName: string;
  lastVerifiedDate: string; // ISO format date, e.g. "2024-01-15T00:00:00Z"
  isActive: boolean; // always true
}`;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log("🚀 Starting Massive Scheme Generation...");
  const allSchemes = [];
  
  for (const state of TARGET_STATES) {
    console.log("Generating schemes for: " + state + "...");
    
    const prompt = "You are an expert on Indian Government Schemes (Central and State level) designed to assist micro-entrepreneurs, MSMEs, farmers, artisans, and small business owners.\n\n" +
      "Generate a JSON array of EXACTLY " + BATCH_SIZE + " highly accurate, diverse, and realistic government schemes for: '" + state + "'.\n" +
      "Ensure they cover various categories like Agriculture, Manufacturing, Micro-Credit, and Women Entrepreneurship.\n" +
      "Use verified scheme names (like PMEGP, Stand-Up India, MUDRA for Central, or specific state-level schemes like 'YSR Cheyutha' for AP, 'Bhavantar Bhugtan' for MP, etc).\n" +
      "If generating State schemes, ensure 'governmentLevel' is 'state' and 'state' matches '" + state + "'.\n" +
      "If generating Central schemes, ensure 'governmentLevel' is 'central' and omit 'state'.\n\n" +
      "Output MUST strictly follow this JSON schema:\n" + SCHEMA;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      let parsed = [];
      try {
        parsed = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse JSON for " + state + ". Retrying...");
        continue;
      }

      if (Array.isArray(parsed)) {
        allSchemes.push(...parsed);
        console.log("✅ Generated " + parsed.length + " schemes for " + state);
      }
    } catch (e) {
      console.error("❌ API Error for " + state + ":", e);
    }
    
    // Rate limiting delay
    await delay(3000);
  }

  // Assign deterministic IDs
  const finalSchemes = allSchemes.map((s, idx) => ({
    id: "sch_" + Date.now() + "_" + idx + "_" + Math.random().toString(36).substring(2, 7),
    ...s
  }));

  const outputPath = resolve(process.cwd(), 'scripts', 'massive-seed.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalSchemes, null, 2));
  
  console.log("\n🎉 Success! Wrote " + finalSchemes.length + " schemes to " + outputPath);
}

run().catch(console.error);
