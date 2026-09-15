import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client.
 *
 * SECURITY: The anon key is PUBLIC by design in Supabase and safe to ship to browsers.
 * Security is enforced by Row Level Security (RLS) policies in PostgreSQL, NOT by hiding the key.
 * The service-role key must NEVER be added to frontend code - it belongs only on trusted servers.
 *
 * These fallback values allow the app to work immediately. Override with .env.local if needed.
 */

// Fallback values - the anon key is PUBLIC and safe to include (security is in RLS policies)
const FALLBACK_URL = "https://khaxdoosuzzanardcnjx.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYXhkb29zdXp6YW5hcmRjbmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NjQ1NTUsImV4cCI6MjEwNDI0MDU1NX0.Rg4PlwOFu3u0UQl9020q4GeVcCwFusUEHDRCGGf_Rbs";

// Use environment variables if provided, otherwise use fallbacks
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

export const projectRef = (() => {
  try {
    return new URL(SUPABASE_URL).hostname.split(".")[0];
  } catch {
    return "unknown";
  }
})();

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
