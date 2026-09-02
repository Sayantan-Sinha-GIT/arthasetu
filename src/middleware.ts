import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Basic memory store for rate limiting (Note: in Vercel Edge runtime, this state is 
// isolated per edge region and may reset, but it provides a good baseline burst protection for prototypes)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

const RATE_LIMIT_MAX_REQUESTS = 30; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

export function middleware(request: NextRequest) {
  // Apply rate limiting specifically to the API routes to prevent brute force / abuse
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    const record = rateLimitMap.get(ip);
    
    if (record) {
      if (now - record.timestamp > RATE_LIMIT_WINDOW_MS) {
        // Reset window
        rateLimitMap.set(ip, { count: 1, timestamp: now });
      } else {
        if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
          return new NextResponse(
            JSON.stringify({ success: false, error: 'Too many requests. For your security, please wait a minute before trying again.' }),
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
  matcher: '/api/:path*',
};
