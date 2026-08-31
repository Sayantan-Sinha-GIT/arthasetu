import { NextRequest, NextResponse } from 'next/server';
import {
  generateContentStream,
  GEMINI_MODELS,
  classifyAdvisorQuery,
  getAdvisorOffTopicRedirect,
} from '@/lib/gemini';
import { buildAdvisorSystemPrompt } from '@/lib/prompts/advisor';
import type { ChatMessage, UserProfile } from '@/types';

// Explicit maxDuration config per PRD §6.4 for Vercel Hobby plan
export const maxDuration = 60;

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
    let formattedPrompt = '';
    if (conversationHistory.length > 0) {
      // Include only recent messages to respect context window and rate limits
      const recentHistory = conversationHistory.slice(-6);
      formattedPrompt += 'RECENT CONVERSATION HISTORY:\n';
      for (const msg of recentHistory) {
        const speaker = msg.role === 'user' ? 'Entrepreneur' : 'ArthaSetu';
        formattedPrompt += `${speaker}: ${msg.content}\n\n`;
      }
      formattedPrompt += `Current Question: ${message}`;
    } else {
      formattedPrompt = message;
    }

    // Stream the response using ReadableStream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const contentStream = generateContentStream(
            GEMINI_MODELS.FLASH,
            systemInstruction,
            formattedPrompt,
            { temperature: 0.7, maxOutputTokens: 2048 }
          );

          for await (const chunk of contentStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (streamError) {
          console.error('Error during Gemini stream:', streamError);
          const errorMsg =
            streamError instanceof Error && streamError.message.includes('429')
              ? '\n\n*(AI assistance is experiencing high traffic. Please try again shortly.)*'
              : '\n\n*(An error occurred while generating the advice. Please try again.)*';
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
