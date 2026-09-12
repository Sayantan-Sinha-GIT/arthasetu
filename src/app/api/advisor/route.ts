import { NextRequest, NextResponse } from 'next/server';
import { Type, type Tool } from '@google/genai';
import {
  generateAgentStream,
  GEMINI_MODELS,
  classifyAdvisorQuery,
  getAdvisorOffTopicRedirect,
  hasLocalizedOffTopicRedirect,
} from '@/lib/gemini';
import { ADVISOR_ERROR_MARKER, formatIndianRupees } from '@/lib/advisor/understanding';
import { calculateFinancialPlan, getPlausibilityWarnings, sanitizePlanInputs } from '@/lib/calculator';
import { matchSchemesForProfile } from '@/lib/schemes/matcher';
import {
  loadLastCalculation,
  loadLiveSchemes,
  loadUserProfileAsAdmin,
  saveLastCalculation,
  savePlanAsAdmin,
  updateUserProfileAsAdmin,
  type StoredCalculation,
} from '@/lib/server/profile-store';
import { BUSINESS_CATEGORIES, EXPERIENCE_LEVELS, GENDERS } from '@/lib/constants/profile-options';
import { normalizeAdvisorProfileUpdates } from '@/lib/profile/advisor-profile-updates';
import { buildAdvisorSystemPrompt } from '@/lib/prompts/advisor';
import { optionalUserUid } from '@/lib/user-auth';
import { getErrorMessage } from '@/lib/utils/errors';
import type { ChatMessage, UserProfile, PlanInputs, CalculatedValues, Plan, Scheme } from '@/types';

// Explicit maxDuration config per PRD §6.4 for Vercel Hobby plan
export const maxDuration = 60;

interface AdvisorSessionOptions {
  /**
   * The verified signed-in user. null means the request carried no valid
   * sign-in, so nothing may be saved. Left undefined only by tests that drive
   * the tools directly with a profile of their own.
   */
  uid?: string | null;
  updateProfileFn?: (uid: string, updates: Record<string, unknown>) => Promise<void>;
  loadSchemesFn?: () => Promise<Scheme[]>;
  saveLastPlanFn?: (uid: string, value: StoredCalculation) => Promise<void>;
  loadLastPlanFn?: (uid: string) => Promise<StoredCalculation | null>;
}

const asStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item ?? '').trim()).filter(Boolean) : [];

/**
 * Tool handlers for one advisor request.
 *
 * The profile and plan tools used to save with the browser Firebase SDK from
 * inside this server route. A server has no signed-in Firebase user, so the
 * security rules refused every one of those writes, and the uid they wrote to
 * came from the request body. They now write with server credentials to the
 * uid verified from the request's ID token.
 */
export function createAdvisorSession(
  savePlanFn: (uid: string, data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string> = savePlanAsAdmin,
  {
    uid,
    updateProfileFn = updateUserProfileAsAdmin,
    loadSchemesFn = loadLiveSchemes,
    saveLastPlanFn = saveLastCalculation,
    loadLastPlanFn = loadLastCalculation,
  }: AdvisorSessionOptions = {}
) {
  const ownerUid = (profile?: Partial<UserProfile> | null) => (uid === undefined ? profile?.uid : uid) || null;
  let lastCalculatedPlan: { inputs: PlanInputs; calculatedValues: CalculatedValues } | null = null;
  // One plan per request. When a provider fails after the save tool has run,
  // the request is replayed on the fallback provider, which calls it again.
  let savedPlanId: string | null = null;

  const toolHandler = async (name: string, args: Record<string, unknown>, userProfile?: Partial<UserProfile> | null) => {
      if (name === 'calculateFinancials') {
        // Negative figures and numbers written as text ("50,000") are cleaned first.
        const inputs = sanitizePlanInputs(args as unknown as PlanInputs);
        const calculated = calculateFinancialPlan(inputs);
        lastCalculatedPlan = { inputs, calculatedValues: calculated };
        // Kept for the user's next message, where "yes, save it" arrives in a
        // new request. Only for a verified sign-in.
        if (typeof uid === 'string' && uid) {
          await saveLastPlanFn(uid, lastCalculatedPlan).catch((e) =>
            console.warn('Could not remember the calculation:', getErrorMessage(e))
          );
        }

        const warnings = getPlausibilityWarnings(calculated);
        return {
          ...calculated,
          ...(warnings.length > 0
            ? {
                plausibilityWarning: `${warnings.map((w) => w.message).join(' ')} Please ask the user to double-check their revenue, price, sales volume and monthly costs.`,
              }
            : {}),
        };
      }
      if (name === 'matchSchemes') {
        // Live schemes, so what the admin publishes is what the advisor matches.
        // The best eight, with the scheme's own benefit wording and amounts
        // already written in lakh and crore, so the model quotes the record
        // instead of recalling or reformatting figures.
        const matches = matchSchemesForProfile(await loadSchemesFn(), userProfile || null).slice(0, 8);
        return matches.map(m => ({
          name: m.scheme.name,
          shortName: m.scheme.shortName,
          description: m.scheme.description,
          matchScore: m.matchScore,
          subsidyPercent: m.scheme.benefits?.maxSubsidyPercent,
          maxFunding: formatIndianRupees(m.scheme.benefits?.maxFundingAmount),
          subsidyDetails: m.scheme.benefits?.subsidyDetails,
          loanDetails: m.scheme.benefits?.loanDetails,
        }));
      }
      if (name === 'saveGeneratedPlan') {
        const owner = ownerUid(userProfile);
        if (!owner) return { error: 'User not logged in or missing ID' };
        if (savedPlanId) return { success: true, planId: savedPlanId, message: 'Plan already saved' };
        if (!lastCalculatedPlan && typeof uid === 'string' && uid) {
          lastCalculatedPlan = await loadLastPlanFn(uid).catch(() => null);
        }
        if (!lastCalculatedPlan) {
          return { error: 'You must run calculateFinancials first before saving a plan. Do not guess the numbers.' };
        }
        const narrative = (args.narrative && typeof args.narrative === 'object' ? args.narrative : {}) as Record<string, unknown>;
        // The saved plan feeds the plan page and the PDF report, which need a
        // business name and a location to print, not blanks.
        const inputs: PlanInputs = {
          ...lastCalculatedPlan.inputs,
          businessType:
            lastCalculatedPlan.inputs.businessType || String(args.businessType || '').trim() || userProfile?.businessType || 'Micro-Enterprise',
          businessScale: lastCalculatedPlan.inputs.businessScale || '',
          location:
            lastCalculatedPlan.inputs.location ||
            [userProfile?.locality, userProfile?.district, userProfile?.state].filter(Boolean).join(', '),
        };
        try {
          const docId = await savePlanFn(owner, {
            userId: owner,
            title: String(args.title || '').trim() || 'Generated Business Plan',
            businessType: inputs.businessType,
            inputs,
            calculatedValues: lastCalculatedPlan.calculatedValues,
            aiNarrative: {
              executiveSummary: String(narrative.executiveSummary ?? '').trim(),
              keyAssumptions: asStringList(narrative.keyAssumptions),
              riskAnalysis: asStringList(narrative.riskAnalysis),
              actionableNextSteps: asStringList(narrative.actionableNextSteps),
            },
          });
          savedPlanId = docId;
          return { success: true, planId: docId, message: 'Plan saved successfully' };
        } catch (e) {
          return { error: 'Failed to save plan: ' + getErrorMessage(e) };
        }
      }
      if (name === 'updateProfile') {
        const owner = ownerUid(userProfile);
        if (!owner) return { error: 'User not logged in or missing ID' };
        // Checked and converted to the exact values the profile form uses; blanks
        // never overwrite a real answer.
        const { updates, rejected } = normalizeAdvisorProfileUpdates(args, userProfile);
        const notSaved = Object.keys(rejected).length > 0
          ? {
              notSaved: rejected,
              instruction: 'Kindly tell the user which of these details could not be saved and why, and ask for them again.',
            }
          : {};
        if (Object.keys(updates).length === 0) {
          return { success: false, message: 'Nothing valid to save.', ...notSaved };
        }
        try {
          await updateProfileFn(owner, updates as Record<string, unknown>);
          // Mutate the local userProfile so subsequent tools in this session use the new data
          if (userProfile) Object.assign(userProfile, updates);
          return { success: true, saved: updates, message: 'Profile updated successfully', ...notSaved };
        } catch (e) {
          return { error: 'Failed to update profile: ' + getErrorMessage(e) };
        }
      }
      return { error: 'Unknown tool' };
    };

  return { toolHandler };
}

export const ADVISOR_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'calculateFinancials',
        description: 'Calculates project viability, funding gap, and loan EMI deterministically based on business inputs. Call this tool when the user asks for financial estimates, project costs, or viability of a business idea. For someone who already runs the business and wants to grow it, use planType "existing_expansion" with their current monthly revenue and expenses and the expansion costs.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            businessType: { type: Type.STRING, description: 'Type of business (e.g. Tailoring, Dairy, Grocery)' },
            planType: { type: Type.STRING, enum: ['startup', 'existing_expansion'], description: '"startup" for a new business, "existing_expansion" to grow a business that is already running' },
            location: { type: Type.STRING, description: 'Village/town, district and state where the business runs' },
            businessScale: { type: Type.STRING, description: 'Size of the unit, e.g. "500 broilers per batch", "2 sewing machines"' },
            equipmentCost: { type: Type.NUMBER, description: 'Cost of machinery or equipment (INR)' },
            setupCost: { type: Type.NUMBER, description: 'Cost of shop setup/shed (INR)' },
            initialInventory: { type: Type.NUMBER, description: 'Initial stock/raw materials cost (INR)' },
            workingCapitalReserve: { type: Type.NUMBER, description: 'Reserve cash (INR)' },
            availableSavings: { type: Type.NUMBER, description: 'User\'s available savings/budget (INR)' },
            unitPrice: { type: Type.NUMBER, description: 'Average price per unit/customer (INR)' },
            unitsSoldPerMonth: { type: Type.NUMBER, description: 'Expected units/customers per month' },
            otherMonthlyRevenue: { type: Type.NUMBER, description: 'Any other monthly income from the business (INR)' },
            monthlyRawMaterials: { type: Type.NUMBER, description: 'Monthly cost of raw materials (INR)' },
            monthlyRentUtilities: { type: Type.NUMBER, description: 'Monthly rent and utilities (INR)' },
            monthlyLabor: { type: Type.NUMBER, description: 'Monthly labor cost (INR)' },
            monthlyTransportPackaging: { type: Type.NUMBER, description: 'Monthly transport and packaging cost (INR)' },
            monthlyMaintenanceOther: { type: Type.NUMBER, description: 'Monthly maintenance and other costs (INR)' },
            loanInterestRatePercent: { type: Type.NUMBER, description: 'Annual loan interest rate in percent, only if the user gives one (default 9.5)' },
            loanTenureMonths: { type: Type.NUMBER, description: 'Loan tenure in months, only if the user gives one (default 36)' },
            currentMonthlyRevenue: { type: Type.NUMBER, description: 'existing_expansion only: current monthly revenue (INR)' },
            currentMonthlyExpenses: { type: Type.NUMBER, description: 'existing_expansion only: current monthly expenses (INR)' },
            expansionEquipmentCost: { type: Type.NUMBER, description: 'existing_expansion only: cost of new equipment for the expansion (INR)' },
            expansionWorkingCapital: { type: Type.NUMBER, description: 'existing_expansion only: extra working capital needed (INR)' },
            projectedRevenueIncreasePercent: { type: Type.NUMBER, description: 'existing_expansion only: expected revenue growth in percent, if no unit price and volume are given' },
          }
        }
      },
      {
        name: 'matchSchemes',
        description: 'Finds eligible government schemes for the user based on their profile. Call this tool when the user asks about government schemes, loans, subsidies, or financial assistance.',
        parameters: {
          type: Type.OBJECT,
          properties: {}
        }
      },
      {
        name: 'saveGeneratedPlan',
        description: 'Saves a completed business plan to the user\'s profile. Call this ONLY after the user explicitly confirms they want to save the plan in response to your question "Should I save this plan for you?".',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'A short, descriptive title for the business plan' },
            businessType: { type: Type.STRING, description: 'Type of business' },
            narrative: {
              type: Type.OBJECT,
              description: 'Qualitative analysis for the plan, written in the user\'s language.',
              properties: {
                executiveSummary: { type: Type.STRING },
                keyAssumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                riskAnalysis: { type: Type.ARRAY, items: { type: Type.STRING } },
                actionableNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      },
      {
        name: 'updateProfile',
        description:
          'Saves details the user reveals about themselves or their business, whether volunteered or given in answer to your question. Call this immediately after they tell you something, so the profile fills in as the conversation goes and they are never asked twice. This includes corrections — if the user changes a value they already gave you earlier in the conversation (or that was already on their profile), call this again with the new value. Never continue using an old value after the user has told you it changed. Pass only the fields they actually gave you. If the result lists notSaved fields, tell the user what could not be saved and ask again.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'The user\'s full name' },
            dob: { type: Type.STRING, description: 'Date of birth as YYYY-MM-DD, e.g. "1990-08-23" for 23 August 1990' },
            gender: { type: Type.STRING, enum: GENDERS, description: 'Gender' },
            businessType: { type: Type.STRING, description: 'Specific trade, e.g. "Poultry Broiler Unit", "Tailoring"' },
            businessCategory: { type: Type.STRING, enum: BUSINESS_CATEGORIES, description: 'Broad sector that best fits the trade' },
            businessExperience: { type: Type.STRING, enum: EXPERIENCE_LEVELS, description: 'Years of experience in the trade' },
            businessStatus: { type: Type.STRING, enum: ['existing', 'planning'], description: '"existing" if already running, "planning" if not started yet' },
            availableCapital: { type: Type.NUMBER, description: 'Own savings the user can put in, in INR' },
            desiredFunding: { type: Type.NUMBER, description: 'External funding or loan the user wants, in INR' },
            monthlyIncome: { type: Type.NUMBER, description: 'Current monthly income from the business, in INR' },
            monthlyExpenses: { type: Type.NUMBER, description: 'Current monthly business expenses, in INR' },
            annualTurnover: { type: Type.NUMBER, description: 'Yearly turnover of the business, in INR' },
            employeeCount: { type: Type.NUMBER, description: 'Number of people working in the business besides the owner' },
            // Location drives scheme matching, and the profile checklist counts
            // it, but the tool could not write it — so anything the advisor
            // asked about location was lost the moment the chat ended.
            state: { type: Type.STRING, description: 'Indian State or UT, e.g. "Assam"' },
            district: { type: Type.STRING, description: 'Administrative district, e.g. "Nagaon"' },
            locality: { type: Type.STRING, description: 'Village, town or post office' },
            pinCode: { type: Type.STRING, description: '6-digit Indian postal code' },
            existingLoans: { type: Type.BOOLEAN, description: 'Whether the user currently has any loan' },
            loans: {
              type: Type.ARRAY,
              description: 'The complete list of the user\'s current loans, if they describe them',
              items: {
                type: Type.OBJECT,
                properties: {
                  lenderType: { type: Type.STRING, enum: ['bank', 'nbfc', 'shg_cooperative', 'informal'], description: 'Who lent the money' },
                  outstandingAmount: { type: Type.NUMBER, description: 'Amount still to be repaid, in INR' },
                  monthlyEmi: { type: Type.NUMBER, description: 'Monthly instalment, in INR' },
                },
              },
            },
          }
        }
      }
    ]
  }
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      conversationHistory = [],
      userProfile: bodyProfile = null,
      language = 'en',
    }: {
      message: string;
      conversationHistory?: ChatMessage[];
      userProfile?: Partial<UserProfile> | null;
      language?: string;
    } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }
    const history = Array.isArray(conversationHistory) ? conversationHistory : [];

    // Who is asking, and their saved profile, looked up alongside the scope
    // check rather than after it, so neither adds to the wait. A uid in the
    // request body is not evidence of who is asking.
    const identity = (async () => {
      const uid = await optionalUserUid(req);
      const storedProfile = uid
        ? await loadUserProfileAsAdmin(uid).catch((e) => {
            console.warn('Could not load the stored profile:', getErrorMessage(e));
            return null;
          })
        : null;
      return { uid, storedProfile };
    })();

    // The conversation goes along so a reply to the advisor's own question
    // ("date of birth is 23 aug 1990") is not judged as a stray message.
    const topicClassification = hasLocalizedOffTopicRedirect(language)
      ? await classifyAdvisorQuery(message, history)
      : 'ON_TOPIC';
    if (topicClassification === 'OFF_TOPIC') {
      const redirectMessage = getAdvisorOffTopicRedirect(language);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(redirectMessage));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      });
    }

    const { uid, storedProfile } = await identity;
    // The saved profile, not the copy the page loaded when it opened: details
    // the advisor saved earlier in this same chat exist only in the database,
    // so the stale copy made it ask for them again.
    const userProfile: Partial<UserProfile> | null = storedProfile ?? bodyProfile;
    const systemInstruction = buildAdvisorSystemPrompt(userProfile, language, message);

    // The last six turns, three questions and answers, were all the model saw.
    // People who answer in fragments ("2", "haan", "do lakh") need more of the
    // conversation to be understood, so twelve are kept, each capped in length.
    const historyContext: { role: string; parts: { text: string }[] }[] = history
      .filter((msg) => typeof msg?.content === 'string' && msg.content.trim().length > 0)
      .slice(-12)
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content.slice(0, 4000) }],
      }));
    historyContext.push({ role: 'user', parts: [{ text: message }] });

    // Stream the response using ReadableStream
    const encoder = new TextEncoder();
    const session = createAdvisorSession(undefined, { uid });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const contentStream = generateAgentStream(
            GEMINI_MODELS.FLASH,
            systemInstruction,
            historyContext,
            ADVISOR_TOOLS,
            (name, args) => session.toolHandler(name, args, userProfile),
            { temperature: 0.7, maxOutputTokens: 2048 }
          );

          for await (const chunk of contentStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (streamError) {
          console.error('Error during Gemini stream:', streamError);
          // The chat screen replaces this marker with a message in the user's
          // language and a "Try again" button.
          controller.enqueue(encoder.encode(`\n\n${ADVISOR_ERROR_MARKER}`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error: unknown) {
    console.error('Advisor API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
