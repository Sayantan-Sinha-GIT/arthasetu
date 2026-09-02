import { NextResponse, type NextRequest } from 'next/server';

// Admin-only routes
const adminRoutes = ['/admin'];

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_MAX_REQUESTS = 30; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    
    if (record) {
      if (now - record.timestamp > RATE_LIMIT_WINDOW_MS) {
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

  // Admin routes: additional protection layer
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    // Admin access is primarily enforced client-side via AuthContext.isAdmin
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files, and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
