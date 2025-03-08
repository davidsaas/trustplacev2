import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/env';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  // Get redirectTo from query params or use dashboard as default
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Get the base URL for the current environment
  const baseUrl = getBaseUrl();
  
  // Ensure redirectTo starts with a slash
  const normalizedRedirectTo = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`;
  
  // Use an absolute URL to avoid localhost redirection issues
  const absoluteRedirectUrl = `${baseUrl}${normalizedRedirectTo}`;

  // Redirect to the target page after authentication with absolute URL
  return NextResponse.redirect(absoluteRedirectUrl);
} 