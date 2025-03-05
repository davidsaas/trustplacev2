import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // This is needed because cookies() from next/headers is read-only.
            // This is not an issue in Route Handlers or Server Actions
            // because they have the ability to set cookies in the response.
          },
          remove(name: string, options: any) {
            // This is needed because cookies() from next/headers is read-only.
            // This is not an issue in Route Handlers or Server Actions
            // because they have the ability to set cookies in the response.
          },
        },
      }
    );
    
    await supabase.auth.exchangeCodeForSession(code);
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/dashboard', request.url));
} 