import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getSession() {
  const cookieStore = cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        set(name: string, value: string, options: any) {
          // This is a server component, we can't set cookies directly
        },
        remove(name: string, options: any) {
          // This is a server component, we can't remove cookies directly
        },
      },
    }
  );
  
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}