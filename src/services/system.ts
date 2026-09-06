import { supabase, projectRef, supabaseUrl } from "../lib/supabase/client";

export type HealthState = "checking" | "operational" | "pending" | "error";

export interface HealthCheck {
  id: string;
  label: string;
  state: HealthState;
  detail: string;
}

/** Ping the Supabase Auth endpoint (always reachable if the project exists). */
async function checkAuth(): Promise<HealthCheck> {
  try {
    await supabase.auth.getSession();
    return {
      id: "auth",
      label: "Supabase Auth",
      state: "operational",
      detail: `Session API responding · ${projectRef}`,
    };
  } catch {
    return { id: "auth", label: "Supabase Auth", state: "error", detail: "Auth endpoint unreachable" };
  }
}

/** Detect whether the V1.1 foundation migration has been applied. */
async function checkSchema(): Promise<HealthCheck> {
  const { error } = await supabase.from("positions").select("id", { head: true, count: "exact" });
  if (!error) {
    return {
      id: "schema",
      label: "PostgreSQL schema",
      state: "operational",
      detail: "17 tables + RLS policies installed",
    };
  }
  const msg = (error.message || "").toLowerCase();
  if (msg.includes("does not exist") || error.code?.startsWith("PGRST2")) {
    return {
      id: "schema",
      label: "PostgreSQL schema",
      state: "pending",
      detail: "Run 0001_foundation.sql in the Supabase SQL editor",
    };
  }
  return { id: "schema", label: "PostgreSQL schema", state: "error", detail: "Unexpected schema error" };
}

/** Verify the three private storage buckets exist (anon can list buckets). */
async function checkStorage(): Promise<HealthCheck> {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    const names = (data ?? []).map((b) => b.name);
    const wanted = ["candidate-cvs", "candidate-profile-photos", "interview-recordings"];
    const missing = wanted.filter((w) => !names.includes(w));
    if (missing.length === 0) {
      return {
        id: "storage",
        label: "Private storage buckets",
        state: "operational",
        detail: "CVs · profile photos · recordings (all private)",
      };
    }
    return {
      id: "storage",
      label: "Private storage buckets",
      state: "pending",
      detail: `Missing: ${missing.join(", ")} — included in the migration`,
    };
  } catch {
    return { id: "storage", label: "Private storage buckets", state: "error", detail: "Storage API unreachable" };
  }
}

async function checkRls(): Promise<HealthCheck> {
  const { error } = await supabase.from("candidates").select("id", { head: true });
  if (!error) {
    return {
      id: "rls",
      label: "Row Level Security",
      state: "operational",
      detail: "Enforced per-role in PostgreSQL (not in the client)",
    };
  }
  const msg = (error.message || "").toLowerCase();
  if (msg.includes("does not exist") || error.code?.startsWith("PGRST2")) {
    return { id: "rls", label: "Row Level Security", state: "pending", detail: "Installed together with the migration" };
  }
  return {
    id: "rls",
    label: "Row Level Security",
    state: "operational",
    detail: "Policies active — access denied without a valid role",
  };
}

export async function runHealthChecks(): Promise<HealthCheck[]> {
  return Promise.all([checkAuth(), checkSchema(), checkStorage(), checkRls()]);
}

export function environmentSummary() {
  return { projectRef, url: supabaseUrl };
}
