import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  // Check if the user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  const path = request.nextUrl.pathname;
  
  // Public routes that don't require redirection
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/forgot-password'];
  
  // If user is authenticated and trying to access the landing page, redirect to dashboard
  if (session && (path === '/' || publicRoutes.includes(path))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!session && path.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return res;
}

// Only run middleware on specific paths
export const config = {
  matcher: ['/', '/login', '/signup', '/dashboard/:path*', '/saved', '/premium', '/report'],
}; 