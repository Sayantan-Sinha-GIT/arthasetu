import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/server/logger';
import { checkRateLimit } from '@/lib/server/rate-limit';

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const rateCheck = await checkRateLimit(req, 'client-errors', null, { persist: false });
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const rawBody = await req.text();
    if (rawBody.length > 2048) {
      return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const message = typeof body.message === 'string' ? body.message.slice(0, 500) : 'Unknown client error';
    const stack = typeof body.stack === 'string' ? body.stack.slice(0, 1000) : '';
    const digest = typeof body.digest === 'string' ? body.digest.slice(0, 100) : '';
    const url = typeof body.url === 'string' ? body.url.slice(0, 200) : '';

    logger.error(`Client Error: ${message}`, {
      route: '/api/client-errors',
      details: {
        clientUrl: url,
        digest,
        stack,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
