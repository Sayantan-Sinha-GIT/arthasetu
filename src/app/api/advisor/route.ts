import { NextRequest, NextResponse } from 'next/server';
import { Type, type Tool } from '@google/genai';
import {
  generateAgentStream,
  GEMINI_MODELS,
  classifyAdvisorQuery,
  getAdvisorOffTopicRedirect,
} from '@/lib/gemini';
import { calculateFinancialPlan } from '@/lib/calculator';
import { matchSchemesForProfile } from '@/lib/schemes/matcher';
import { SEED_SCHEMES } from '@/lib/schemes/seed-data';
import { savePlan } from '@/lib/firestore/plans';
import { buildAdvisorSystemPrompt } from '@/lib/prompts/advisor';
import { updateUserProfile } from '@/lib/firestore/users';
import { getErrorMessage } from '@/lib/utils/errors';
import type { ChatMessage, UserProfile, PlanInputs, CalculatedValues } from '@/types';

// Explicit maxDuration config per PRD §6.4 for Vercel Hobby plan
export const maxDuration = 60;

export function createAdvisorSession(savePlanFn = savePlan) {
  let lastCalculatedPlan: { inputs: PlanInputs; calculatedValues: CalculatedValues } | null = null;

  const toolHandler = async (name: string, args: Record<string, unknown>, userProfile?: Partial<UserProfile> | null) => {
      if (name === 'calculateFinancials') {
        const calculated = calculateFinancialPlan(args as unknown as PlanInputs);
        lastCalculatedPlan = { inputs: args as unknown as PlanInputs, calculatedValues: calculated };
        
        let plausibilityWarning = undefined;
        if (calculated.monthlyGrossRevenue > calculated.totalInitialCost * 20) {
          plausibilityWarning = "Monthly revenue is over 20x the total initial project cost, which is highly unrealistic for a micro-enterprise. Please ask the user to double-check their revenue, price, or sales volume.";
        }
        
        return {
          ...calculated,
          ...(plausibilityWarning ? { plausibilityWarning } : {})
        };
      }
      if (name === 'matchSchemes') {
        const matches = matchSchemesForProfile(SEED_SCHEMES, userProfile || null);
        return matches.map(m => ({
          name: m.scheme.name,
          description: m.scheme.description,
          matchScore: m.matchScore,
          subsidy: m.scheme.benefits.maxSubsidyPercent,
          maxFunding: m.scheme.benefits.maxFundingAmount,
        }));
      }
      if (name === 'saveGeneratedPlan') {
        if (!userProfile?.uid) return { error: 'User not logged in or missing ID' };
        if (!lastCalculatedPlan) {
          return { error: 'You must run calculateFinancials first before saving a plan. Do not guess the numbers.' };
        }
        try {
          const docId = await savePlanFn(userProfile.uid, {
            userId: userProfile.uid,
            title: (args.title as string) || 'Generated Business Plan',
            businessType: (args.businessType as string) || 'Micro-Enterprise',
            inputs: lastCalculatedPlan.inputs,
            calculatedValues: lastCalculatedPlan.calculatedValues,
            aiNarrative: args.narrative as {
              executiveSummary: string;
              keyAssumptions: string[];
              riskAnalysis: string[];
              actionableNextSteps: string[];
            },
          });
          return { success: true, planId: docId, message: 'Plan saved successfully' };
        } catch (e) {
          return { error: 'Failed to save plan: ' + getErrorMessage(e) };
        }
      }
      if (name === 'updateProfile') {
        if (!userProfile?.uid) return { error: 'User not logged in or missing ID' };
        try {
          // Remove undefined or null args to avoid overwriting with empty
          const cleanArgs = Object.fromEntries(Object.entries(args).filter(([_, v]) => v != null));
          await updateUserProfile(userProfile.uid, cleanArgs);
          // Mutate the local userProfile so subsequent tools in this session use the new data
          Object.assign(userProfile, cleanArgs);
          return { success: true, message: 'Profile updated successfully' };
        } catch (e) {
          return { error: 'Failed to update profile: ' + getErrorMessage(e) };
        }
      }
      return { error: 'Unknown tool' };
    };

  return { toolHandler };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      conversationHistory = [],
      userProfile = null,
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

    // Fast scope classification before running main streaming generation
    const topicClassification = await classifyAdvisorQuery(message);
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

    const systemInstruction = buildAdvisorSystemPrompt(userProfile, language);

    // Format conversation history for Gemini context
    // Format conversation history for Gemini context natively
    let historyContext: { role: string; parts: { text: string }[] }[] = [];
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-6);
      historyContext = recentHistory.map((msg: ChatMessage) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
    }
    historyContext.push({ role: 'user', parts: [{ text: message }] });

    const tools: Tool[] = [
      {
        functionDeclarations: [
          {
            name: 'calculateFinancials',
            description: 'Calculates project viability, funding gap, and loan EMI deterministically based on business inputs. Call this tool when the user asks for financial estimates, project costs, or viability of a business idea.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                businessType: { type: Type.STRING, description: 'Type of business (e.g. Tailoring, Dairy, Grocery)' },
                planType: { type: Type.STRING, description: '"startup" or "existing_expansion"' },
                equipmentCost: { type: Type.NUMBER, description: 'Cost of machinery or equipment (INR)' },
                setupCost: { type: Type.NUMBER, description: 'Cost of shop setup/shed (INR)' },
                initialInventory: { type: Type.NUMBER, description: 'Initial stock/raw materials cost (INR)' },
                workingCapitalReserve: { type: Type.NUMBER, description: 'Reserve cash (INR)' },
                availableSavings: { type: Type.NUMBER, description: 'User\'s available savings/budget (INR)' },
                unitPrice: { type: Type.NUMBER, description: 'Average price per unit/customer (INR)' },
                unitsSoldPerMonth: { type: Type.NUMBER, description: 'Expected units/customers per month' },
                monthlyRawMaterials: { type: Type.NUMBER, description: 'Monthly cost of raw materials (INR)' },
                monthlyRentUtilities: { type: Type.NUMBER, description: 'Monthly rent and utilities (INR)' },
                monthlyLabor: { type: Type.NUMBER, description: 'Monthly labor cost (INR)' },
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
                  description: 'Qualitative analysis for the plan.',
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
              'Saves details the user reveals about themselves or their business, whether volunteered or given in answer to your question. Call this immediately after they tell you something, so the profile fills in as the conversation goes and they are never asked twice. Pass only the fields they actually gave you.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                businessType: { type: Type.STRING, description: 'Specific trade, e.g. "Poultry Broiler Unit", "Tailoring"' },
                businessCategory: { type: Type.STRING, description: 'Broad sector, e.g. "Agro & Livestock", "Handicrafts", "Retail"' },
                availableCapital: { type: Type.NUMBER, description: 'Own savings the user can put in, in INR' },
                desiredFunding: { type: Type.NUMBER, description: 'External funding or loan the user wants, in INR' },
                businessExperience: { type: Type.STRING, description: 'Years in the trade, e.g. "0-1 years", "1-3 years", "3-5 years", "5+ years"' },
                businessStatus: { type: Type.STRING, description: '"existing" or "planning"' },
                // Location drives scheme matching, and the profile checklist counts
                // it, but the tool could not write it — so anything the advisor
                // asked about location was lost the moment the chat ended.
                state: { type: Type.STRING, description: 'Indian State or UT, e.g. "Assam"' },
                district: { type: Type.STRING, description: 'Administrative district, e.g. "Nagaon"' },
                locality: { type: Type.STRING, description: 'Village, town or post office' },
                pinCode: { type: Type.STRING, description: '6-digit Indian postal code' }
              }
            }
          }
        ]
      }
    ];


    // Stream the response using ReadableStream
    const encoder = new TextEncoder();
    const session = createAdvisorSession();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const contentStream = generateAgentStream(
            GEMINI_MODELS.FLASH,
            systemInstruction,
            historyContext,
            tools,
            (name, args) => session.toolHandler(name, args, userProfile),
            { temperature: 0.7, maxOutputTokens: 2048 }
          );

          for await (const chunk of contentStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (streamError) {
          console.error('Error during Gemini stream:', streamError);
          const errorMsg =
            streamError instanceof Error && (streamError.message.includes('429') || streamError.message.toLowerCase().includes('quota') || streamError.message.toLowerCase().includes('exhausted'))
              ? '\n\n*(ArthaSetu AI is experiencing high traffic or rate limits. Please wait a few seconds and try again.)*'
              : '\n\n*(A network connection error occurred while reaching the AI servers. Please check your internet connection and try again.)*';
          controller.enqueue(encoder.encode(errorMsg));
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
