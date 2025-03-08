import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://upsiedhtxolcshbunlls.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc2llZGh0eG9sY3NoYnVubGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExNzQxMDAsImV4cCI6MjA1Njc1MDEwMH0.a23c0hAC7Kj_rJqpxHNEdKwmeRMy_ZH88nApJZ41DwA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}); 