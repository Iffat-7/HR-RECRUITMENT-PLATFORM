import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client.
 *
 * SECURITY: only the anon (publishable) key is ever used here. The anon key is
 * safe to ship to browsers — access control is enforced by Row Level Security
 * policies in PostgreSQL. The service-role key must NEVER be added to this
 * project's frontend; it belongs exclusively on a trusted server (see README).
 */

const FALLBACK_URL = "https://khaxdoosuzzanardcnjx.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYXhkb29zdXp6YW5hcmRjbmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NjQ1NTUsImV4cCI6MjEwNDI0MDU1NX0.Rg4PlwOFu3u0UQl9020q4GeVcCwFusUEHDRCGGf_Rbs";

export const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
export const supabaseAnonKey: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

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
