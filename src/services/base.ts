import type { PostgrestError } from "@supabase/supabase-js";
import { classifyError } from "../lib/utils";

/**
 * Unwrap a Supabase response or throw a classified, user-safe AppError.
 * Services throw; UI layers catch — keeps components free of DB plumbing.
 */
export function unwrap<T>(res: { data: T | null; error: PostgrestError | null }): T {
  if (res.error) throw classifyError(res.error);
  return res.data as T;
}

export interface PageParams {
  page?: number;
  pageSize?: number;
}

export function pageRange({ page = 0, pageSize = 25 }: PageParams): [number, number] {
  const from = page * pageSize;
  return [from, from + pageSize - 1];
}
