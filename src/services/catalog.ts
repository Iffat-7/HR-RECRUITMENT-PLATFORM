import { supabase } from "../lib/supabase/client";
import type { Position, Question, QuestionSet, QuestionSetQuestion } from "../types";
import { unwrap } from "./base";
import type { PositionInput, QuestionInput, QuestionSetInput } from "../lib/validation/schemas";

/* ---------------- Positions ---------------- */

export async function listPositions(activeOnly = false): Promise<Position[]> {
  let q = supabase.from("positions").select("*").order("created_at", { ascending: false });
  if (activeOnly) q = q.eq("is_active", true);
  return unwrap(await q) as Position[];
}

export async function createPosition(input: PositionInput): Promise<Position> {
  const res = await supabase
    .from("positions")
    .insert({
      title: input.title,
      description: input.description || null,
      department: input.department || null,
      is_active: true,
    })
    .select()
    .single();
  return unwrap(res) as Position;
}

export async function updatePosition(id: string, input: Partial<PositionInput> & { is_active?: boolean }): Promise<Position> {
  const res = await supabase.from("positions").update(input).eq("id", id).select().single();
  return unwrap(res) as Position;
}

export async function deletePosition(id: string): Promise<void> {
  unwrap(await supabase.from("positions").delete().eq("id", id).select("id"));
}

/* ---------------- Questions ---------------- */

export async function listQuestions(activeOnly = false): Promise<Question[]> {
  let q = supabase.from("questions").select("*").order("created_at", { ascending: false });
  if (activeOnly) q = q.eq("is_active", true);
  return unwrap(await q) as Question[];
}

export async function createQuestion(input: QuestionInput): Promise<Question> {
  const res = await supabase.from("questions").insert(input).select().single();
  return unwrap(res) as Question;
}

export async function updateQuestion(id: string, input: Partial<QuestionInput>): Promise<Question> {
  const res = await supabase.from("questions").update(input).eq("id", id).select().single();
  return unwrap(res) as Question;
}

export async function deleteQuestion(id: string): Promise<void> {
  unwrap(await supabase.from("questions").delete().eq("id", id).select("id"));
}

/* ---------------- Question sets ---------------- */

export async function listQuestionSets(): Promise<QuestionSet[]> {
  const res = await supabase
    .from("question_sets")
    .select(`*, positions(id, title)`)
    .order("created_at", { ascending: false });
  return unwrap(res) as QuestionSet[];
}

export async function createQuestionSet(input: QuestionSetInput): Promise<QuestionSet> {
  const res = await supabase
    .from("question_sets")
    .insert({ name: input.name, description: input.description || null, position_id: input.position_id, is_active: true })
    .select(`*, positions(id, title)`)
    .single();
  return unwrap(res) as unknown as QuestionSet;
}

export async function updateQuestionSet(
  id: string,
  input: { name?: string; description?: string | null; position_id?: string | null; is_active?: boolean }
): Promise<QuestionSet> {
  const res = await supabase.from("question_sets").update(input).eq("id", id).select().single();
  return unwrap(res) as QuestionSet;
}

export async function deleteQuestionSet(id: string): Promise<void> {
  unwrap(await supabase.from("question_sets").delete().eq("id", id).select("id"));
}

export async function getQuestionSetItems(setId: string): Promise<QuestionSetQuestion[]> {
  const res = await supabase
    .from("question_set_questions")
    .select(`question_set_id, question_id, display_order, questions(*)`)
    .eq("question_set_id", setId)
    .order("display_order", { ascending: true });
  return unwrap(res) as unknown as QuestionSetQuestion[];
}

/** Replaces the ordered membership atomically (SECURITY DEFINER). */
export async function saveQuestionSetItems(setId: string, questionIds: string[]): Promise<void> {
  const res = await supabase.rpc("set_question_set_questions", {
    p_set_id: setId,
    p_question_ids: questionIds,
  });
  unwrap(res);
}
