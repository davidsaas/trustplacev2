import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Define routes that require authentication
 * Users will be redirected to login if they try to access these without being logged in
 */
const protectedRoutes = [
  '/dashboard',
  '/premium',
  '/report',
  '/saved',
  '/profile',
];

/**
 * Define routes that are only accessible when logged out
 * Authenticated users will be redirected to dashboard
 */
const publicOnlyRoutes = [
  '/login',
  '/signup',
  '/', // Root path should also redirect authenticated users to dashboard
];

/**
 * Get base URL for creating absolute URLs in middleware
 * This is critical for ensuring redirects go to the correct domain
 */
const getBaseUrl = (request: NextRequest): string => {
  // First priority: App URL from environment
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Second priority: Vercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // When all else fails, use the request host
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
};

/**
 * Auth middleware for route protection
 * This runs on all non-static routes to manage authentication state
 */
export async function middleware(request: NextRequest) {
  try {
    // Create response to modify
    const res = NextResponse.next();
    
    // Setup Supabase auth client for middleware
    const supabase = createMiddlewareClient({ req: request, res });
    
    // Refresh session to ensure auth state is current
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    // Add logging for debugging
    console.log('Middleware path:', request.nextUrl.pathname);
    console.log('Session exists:', !!session);
    
    const path = request.nextUrl.pathname;
    const baseUrl = getBaseUrl(request);
    
    // Protect private routes - redirect to login if not authenticated
    if (protectedRoutes.some(route => path.startsWith(route))) {
      if (!session) {
        console.log('Redirecting to login: No session for protected route');
        // Use absolute URLs with the correct domain
        const loginUrl = new URL('/login', baseUrl);
        loginUrl.searchParams.set('redirectTo', path);
        return NextResponse.redirect(loginUrl);
      }
    }
    
    // Handle login/signup routes and root path - redirect to dashboard if already authenticated
    if (publicOnlyRoutes.some(route => path === route) && session) {
      console.log('Redirecting to dashboard: User is authenticated on public-only route');
      // Use absolute URLs with the correct domain
      const dashboardUrl = new URL('/dashboard', baseUrl);
      return NextResponse.redirect(dashboardUrl);
    }
    
    return res;
  } catch (error) {
    // Log error and return 500 response
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

/**
 * Define which routes this middleware applies to
 * Excludes static files and assets to improve performance
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/).*)',
  ],
};