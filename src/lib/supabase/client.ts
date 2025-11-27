import { createBrowserClient } from '@supabase/ssr';

// Define a function to create a Supabase client for client-side operations
export function createSupabaseBrowserClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',  // ✅ Implicit flow com access_token no hash
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,  // ✅ HABILITAR! Link vem com #access_token=
        debug: process.env.NODE_ENV === 'development',
        storageKey: 'supabase.auth.token',
      },
      global: {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        }
      }
    }
  );

  return client;
} 