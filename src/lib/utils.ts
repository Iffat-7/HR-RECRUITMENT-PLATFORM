import type { PostgrestError } from "@supabase/supabase-js";

/** Tiny class combiner (no external deps). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const bits = name.trim().split(/\s+/);
  return ((bits[0]?.[0] ?? "") + (bits[1]?.[0] ?? "")).toUpperCase() || "?";
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m} min` : `${m}m ${s}s`;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function maskKey(key: string | null | undefined): string {
  if (!key || key.length < 12) return "••••••••";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/* ---------------- Error classification ---------------- */

export type AppErrorKind =
  | "schema_missing" // migration not applied yet
  | "unauthorized"
  | "not_found"
  | "validation"
  | "network"
  | "conflict"
  | "generic";

export interface AppError {
  kind: AppErrorKind;
  message: string;
}

const SCHEMA_CODES = ["PGRST205", "PGRST202", "PGRST201", "42P01", "42883"];

/**
 * Translate raw PostgREST / auth errors into safe, user-friendly messages.
 * Raw database detail is intentionally never surfaced to the UI.
 */
export function classifyError(err: unknown): AppError {
  const e = err as (PostgrestError & { code?: string; status?: number }) | null;
  const code = e?.code ?? "";
  const msg = (e?.message ?? "").toLowerCase();

  if (SCHEMA_CODES.includes(code) || msg.includes("does not exist") || msg.includes("schema cache")) {
    return {
      kind: "schema_missing",
      message:
        "Database foundation not installed on this Supabase project yet. Run supabase/migrations/0001_foundation.sql in the Supabase SQL editor, then retry.",
    };
  }
  if (code === "PGRST301" || msg.includes("jwt") || e?.status === 401) {
    return { kind: "unauthorized", message: "Your session has expired. Sign in again." };
  }
  if (e?.status === 403 || msg.includes("row-level security") || msg.includes("permission denied")) {
    return {
      kind: "unauthorized",
      message: "You don't have permission to perform this action with your current role.",
    };
  }
  if (e?.status === 404 || code === "PGRST116") {
    return { kind: "not_found", message: "The requested record was not found." };
  }
  if (code === "23505") {
    return { kind: "conflict", message: "A record with those details already exists." };
  }
  if (code === "23503") {
    return {
      kind: "conflict",
      message: "This record is referenced by other data (e.g. applications) and can't be removed. Deactivate it instead.",
    };
  }
  if (code === "23514" || code === "23502") {
    return { kind: "validation", message: "Some values are invalid. Check the form and try again." };
  }
  if (msg.includes("fetch") || msg.includes("network") || e?.status === 0) {
    return { kind: "network", message: "Network error — check your connection and retry." };
  }
  if (msg.includes("invalid login credentials")) {
    return { kind: "unauthorized", message: "Invalid email or password." };
  }
  if (msg.includes("email not confirmed")) {
    return { kind: "validation", message: "Please confirm your email address before signing in." };
  }
  return {
    kind: "generic",
    message: "Something went wrong. The event was logged — please try again.",
  };
}
