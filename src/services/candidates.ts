import { supabase } from "../lib/supabase/client";
import type {
  Application,
  Candidate,
  Evaluation,
  Interview,
  StatusHistoryEntry,
} from "../types";
import { unwrap, pageRange, type PageParams } from "./base";
import type { CandidateRegistrationInput, StatusChangeInput } from "../lib/validation/schemas";

const CANDIDATE_COLS = `*, positions(id, title, department)`;

export interface CandidateFilters extends PageParams {
  search?: string;
  status?: string | null;
}

export async function listCandidates(f: CandidateFilters = {}): Promise<{ rows: Candidate[]; count: number }> {
  let q = supabase.from("candidates").select(CANDIDATE_COLS, { count: "exact" });
  if (f.search) {
    const term = f.search.trim().replace(/[,%]/g, "");
    q = q.or(
      `full_name.ilike.%${term}%,reference_code.ilike.%${term}%,email.ilike.%${term}%,mobile.ilike.%${term}%`
    );
  }
  if (f.status) q = q.eq("status", f.status);
  const [from, to] = pageRange(f);
  const res = await q.order("created_at", { ascending: false }).range(from, to);
  return { rows: unwrap(res) as Candidate[], count: res.count ?? 0 };
}

export async function getCandidate(id: string): Promise<Candidate> {
  const res = await supabase.from("candidates").select(CANDIDATE_COLS).eq("id", id).maybeSingle();
  const row = unwrap(res);
  if (!row) throw { kind: "not_found", message: "Candidate not found or access denied." };
  return row as Candidate;
}

export interface CandidateDetail {
  candidate: Candidate;
  applications: Application[];
  history: StatusHistoryEntry[];
  interviews: Interview[];
  evaluations: Evaluation[];
}

export async function getCandidateDetail(id: string): Promise<CandidateDetail> {
  const candidate = await getCandidate(id);
  const [apps, hist, interviews, evals] = await Promise.all([
    supabase
      .from("applications")
      .select(`*, positions(id, title, department)`)
      .eq("candidate_id", id)
      .order("applied_at", { ascending: false }),
    supabase
      .from("status_history")
      .select(`*, profiles(id, full_name)`)
      .eq("candidate_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("interviews").select("*").eq("candidate_id", id).order("created_at", { ascending: false }),
    supabase
      .from("evaluations")
      .select(`*, profiles(id, full_name), evaluation_scores(*, evaluation_categories(id, name, max_score))`)
      .eq("candidate_id", id)
      .order("created_at", { ascending: false }),
  ]);
  return {
    candidate,
    applications: unwrap(apps) as Application[],
    history: unwrap(hist) as StatusHistoryEntry[],
    interviews: unwrap(interviews) as Interview[],
    evaluations: unwrap(evals) as Evaluation[],
  };
}

/**
 * Create a candidate. RLS guarantees:
 *  - self-registered candidates must carry user_id = auth.uid()
 *  - HR roles may create on behalf (user_id null)
 */
export async function createCandidate(
  input: CandidateRegistrationInput,
  userId: string
): Promise<Candidate> {
  const payload = {
    user_id: userId,
    full_name: input.full_name,
    father_husband_name: input.father_husband_name || null,
    mobile: input.mobile,
    email: input.email,
    city: input.city,
    cnic: input.cnic,
    position_id: input.position_id,
    years_of_experience: input.years_of_experience,
    current_employer: input.current_employer || null,
    current_salary:
      input.current_salary === "" || input.current_salary == null
        ? null
        : Number(input.current_salary),
    expected_salary:
      input.expected_salary === "" || input.expected_salary == null
        ? null
        : Number(input.expected_salary),
    notice_period: input.notice_period || null,
    available_joining_date: input.available_joining_date || null,
    consent_given: true,
    consent_timestamp: new Date().toISOString(),
    status: "NEW",
  };
  const res = await supabase.from("candidates").insert(payload).select(CANDIDATE_COLS).single();
  return unwrap(res) as Candidate;
}

/** Status transitions run in a SECURITY DEFINER function: atomic update + history + audit log. */
export async function changeCandidateStatus(
  candidateId: string,
  input: StatusChangeInput
): Promise<void> {
  const res = await supabase.rpc("change_candidate_status", {
    p_candidate_id: candidateId,
    p_new_status: input.new_status,
    p_reason: input.reason || null,
  });
  unwrap(res);
}

/** Instantiates an interview and snapshots the question set (immune to later edits). */
export async function createInterview(
  candidateId: string,
  applicationId: string | null,
  questionSetId: string
): Promise<string> {
  const res = await supabase.rpc("create_interview", {
    p_candidate_id: candidateId,
    p_application_id: applicationId,
    p_question_set_id: questionSetId,
  });
  return unwrap(res) as unknown as string;
}
