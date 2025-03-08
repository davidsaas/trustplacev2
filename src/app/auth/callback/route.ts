import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  // Get redirectTo from query params or use dashboard as default
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Construct the full URL for redirection
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  
  // Ensure redirectTo starts with a slash
  const normalizedRedirectTo = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`;
  
  // Combine base URL with redirect path
  const redirectUrl = new URL(normalizedRedirectTo, baseUrl);

  // Redirect to the target page after authentication
  return NextResponse.redirect(redirectUrl);
} 