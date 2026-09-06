import { supabase } from "../lib/supabase/client";
import type { Interview, InterviewQuestion } from "../types";
import { unwrap } from "./base";

export async function listInterviews(): Promise<Interview[]> {
  const res = await supabase.from("interviews").select("*").order("created_at", { ascending: false });
  return unwrap(res) as Interview[];
}

export interface CandidateInterview extends Interview {
  interview_questions: InterviewQuestion[];
}

/** Start (or resume) an interview — server enforces CV upload + ownership. */
export async function startInterview(interviewId: string): Promise<void> {
  unwrap(await supabase.rpc("start_interview", { p_interview_id: interviewId }));
}

/** Final submission — server refuses unless all required answers are COMPLETED. */
export async function submitInterview(interviewId: string): Promise<void> {
  unwrap(await supabase.rpc("submit_interview", { p_interview_id: interviewId }));
}

/**
 * Persist a question's lifecycle tick (PREPARING / RECORDING / REVIEWING /
 * UPLOADING / FAILED / SKIPPED). COMPLETED is intentionally NOT allowed here —
 * only finalize_recording may set it, so a tampered client can't fake answers.
 */
export async function setQuestionStatus(
  interviewQuestionId: string,
  status: "PENDING" | "PREPARING" | "RECORDING" | "REVIEWING" | "UPLOADING" | "FAILED" | "SKIPPED"
): Promise<void> {
  unwrap(
    await supabase.rpc("update_interview_question_status", {
      p_id: interviewQuestionId,
      p_status: status,
    })
  );
}

/**
 * Candidate-portal view: interviews owned by the signed-in candidate.
 * RLS restricts this to rows where candidates.user_id = auth.uid() — a
 * candidate can never read another candidate's interview, even by guessing ids.
 */
export async function listCandidateInterviews(candidateId: string): Promise<CandidateInterview[]> {
  const res = await supabase
    .from("interviews")
    .select(`*, interview_questions(*)`)
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });
  const rows = (unwrap(res) as CandidateInterview[]).map((i) => ({
    ...i,
    interview_questions: (i.interview_questions ?? []).sort(
      (a, b) => a.display_order - b.display_order
    ),
  }));
  return rows;
}
