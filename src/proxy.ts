import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/advisor',
  '/planner',
  '/schemes',
  '/profile',
  '/onboarding',
  '/saved-plans',
  '/saved-advice',
];

// Routes only for non-authenticated users
const authRoutes = ['/login', '/signup', '/forgot-password'];

// Admin-only routes
const adminRoutes = ['/admin'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Firebase auth cookie/token
  // Note: We use a lightweight check here. Full token verification happens server-side.
  // The __session cookie approach is common with Firebase + Next.js
  // For the MVP, we rely on client-side auth state and redirect handling
  // This middleware mainly handles the admin route protection

  // Admin routes: additional protection layer
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    // Admin access is primarily enforced client-side via AuthContext.isAdmin
    // and server-side via API route token verification
    // This middleware ensures the route exists but doesn't block —
    // the actual admin layout component handles the redirect
  }

  // Let all requests through — auth enforcement happens in:
  // 1. Client-side: AuthContext checks in page components
  // 2. Server-side: API routes verify tokens before processing
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files, api routes, and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
