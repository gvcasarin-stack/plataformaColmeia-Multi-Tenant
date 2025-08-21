import { createClient } from '@supabase/supabase-js';

// Define a function to create a Supabase client for service-level operations (e.g., admin tasks, cron jobs)
// This client uses the SERVICE_ROLE_KEY for elevated privileges.
export function createSupabaseServiceRoleClient() {
  // Ensure that the environment variables are defined, otherwise throw an error.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      // autoRefreshToken and persistSession are not relevant for service role clients
      autoRefreshToken: false,
      persistSession: false,
      // It's good practice to detect a session if one is provided, but usually not needed for service roles
      detectSessionInUrl: false 
    },
  });
}
