import { supabase } from "../lib/supabase/client";
import type { Evaluation, EvaluationCategory } from "../types";
import { unwrap } from "./base";
import type { EvaluationInput } from "../lib/validation/schemas";

/** Scoring categories come from the database — never hardcoded in the UI. */
export async function listEvaluationCategories(): Promise<EvaluationCategory[]> {
  const res = await supabase
    .from("evaluation_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return unwrap(res) as EvaluationCategory[];
}

export async function listEvaluations(): Promise<Evaluation[]> {
  const res = await supabase
    .from("evaluations")
    .select(
      `*, candidates(id, full_name, reference_code), profiles(id, full_name), evaluation_scores(*, evaluation_categories(id, name, max_score))`
    )
    .order("created_at", { ascending: false });
  return unwrap(res) as Evaluation[];
}

/** Atomic insert of evaluation + per-category scores + audit entry (SECURITY DEFINER). */
export async function createEvaluation(
  input: EvaluationInput,
  scores: { category_id: string; score: number }[]
): Promise<void> {
  const res = await supabase.rpc("submit_evaluation", {
    p_candidate_id: input.candidate_id,
    p_interview_id: input.interview_id,
    p_overall: input.overall_score,
    p_recommendation: input.recommendation,
    p_notes: input.notes || null,
    p_category_ids: scores.map((s) => s.category_id),
    p_scores: scores.map((s) => s.score),
  });
  unwrap(res);
}
