import { NextResponse, type NextRequest } from 'next/server';

// Lightweight, bounded edge-level rate limiter for API routes
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_MAP_ENTRIES = 1000;

function cleanOldEntries(now: number) {
  if (rateLimitMap.size > MAX_MAP_ENTRIES) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now - val.timestamp > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(key);
      }
    }
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const rawIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const ip = rawIp.split(',')[0].trim();
    const now = Date.now();
    cleanOldEntries(now);

    const record = rateLimitMap.get(ip);
    
    if (record) {
      if (now - record.timestamp > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(ip, { count: 1, timestamp: now });
      } else {
        if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
          return new NextResponse(
            JSON.stringify({
              success: false,
              error: 'Too many requests. Please wait a moment before trying again.',
              code: 'RATE_LIMITED'
            }),
            { 
              status: 429, 
              headers: { 
                'Content-Type': 'application/json',
                'Retry-After': '60'
              } 
            }
          );
        }
        record.count += 1;
        rateLimitMap.set(ip, record);
      }
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files, and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
