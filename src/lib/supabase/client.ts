import { createBrowserClient } from '@supabase/ssr';

// Define a function to create a Supabase client for client-side operations
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        debug: process.env.NODE_ENV === 'development',
      },
    }
  );
} 