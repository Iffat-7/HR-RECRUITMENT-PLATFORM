import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client.
 *
 * SECURITY: only the anon (publishable) key is ever used here. The anon key is
 * safe to ship to browsers — access control is enforced by Row Level Security
 * policies in PostgreSQL. The service-role key must NEVER be added to this
 * project's frontend; it belongs exclusively on a trusted server (see README).
 */

// Require environment variables - fail fast if missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. ' +
    'See .env.example for configuration instructions.'
  );
}

// After validation, these are guaranteed to be strings
export const SUPABASE_URL: string = supabaseUrl;
export const SUPABASE_ANON_KEY: string = supabaseAnonKey;

export const projectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0];
  } catch {
    return "unknown";
  }
})();

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
