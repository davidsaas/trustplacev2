import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/premium',
  '/report',
  '/saved',
];

// Define public routes that should redirect to dashboard if authenticated
const publicOnlyRoutes = [
  '/login',
  '/signup',
];

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  
  // Create a Supabase client configured for the middleware
  const supabase = createMiddlewareClient({ req: request, res });
  
  // Refresh session if expired - required for server components
  // to work properly with Supabase auth
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  const path = request.nextUrl.pathname;
  
  // Handle protected routes - redirect to login if not authenticated
  if (protectedRoutes.some(route => path.startsWith(route)) && !session) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Handle public only routes - redirect to dashboard if authenticated
  if (publicOnlyRoutes.some(route => path.startsWith(route)) && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return res;
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (optional - remove if you want to protect them too)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 