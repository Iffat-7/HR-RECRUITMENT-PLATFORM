import { supabase } from "../lib/supabase/client";
import type { Recording } from "../types";
import { unwrap } from "./base";
import { createSignedUrl } from "./storage";

/**
 * Recording lifecycle — every write goes through SECURITY DEFINER functions
 * that re-verify candidate ownership, interview state, attempt limits, MIME
 * and size. The client never inserts recording rows directly.
 */

export interface RecordingWithQuestion extends Recording {
  interview_questions: {
    id: string;
    question_text_snapshot: string;
    response_type_snapshot: string;
    display_order: number;
  } | null;
}

export interface PreparedRecording {
  id: string;
  storage_path: string;
}

/** Step 1 of the two-phase upload: server validates and mints the storage path. */
export async function prepareRecording(
  interviewQuestionId: string,
  fileType: "VIDEO" | "AUDIO",
  mimeType: string,
  durationSeconds: number
): Promise<PreparedRecording> {
  const res = await supabase.rpc("prepare_recording", {
    p_interview_question_id: interviewQuestionId,
    p_file_type: fileType,
    p_mime_type: mimeType,
    p_duration_seconds: durationSeconds,
  });
  const row = unwrap(res) as unknown as PreparedRecording[];
  if (!Array.isArray(row) || row.length === 0) {
    throw { kind: "generic", message: "Could not prepare the upload. Please retry." };
  }
  return row[0];
}

/** Step 2: file is in the private bucket — flip the row to UPLOADED. */
export async function finalizeRecording(recordingId: string, fileSize: number): Promise<void> {
  unwrap(
    await supabase.rpc("finalize_recording", {
      p_recording_id: recordingId,
      p_file_size: fileSize,
    })
  );
}

/** Mark an interrupted upload as failed (does not consume an attempt). */
export async function failRecording(recordingId: string): Promise<void> {
  unwrap(await supabase.rpc("fail_recording", { p_recording_id: recordingId }));
}

/** All recordings for an interview, joined to their frozen question snapshot. */
export async function listInterviewRecordings(interviewId: string): Promise<RecordingWithQuestion[]> {
  const res = await supabase
    .from("recordings")
    .select(
      `*, interview_questions!inner(id, question_text_snapshot, response_type_snapshot, display_order)`
    )
    .eq("interview_questions.interview_id", interviewId)
    .order("created_at", { ascending: true });
  return unwrap(res) as unknown as RecordingWithQuestion[];
}

/**
 * HR playback URL — signed, expires in 2 minutes, generated on demand only.
 * Storage RLS restricts this to has_hr_role(); candidates never receive it.
 */
export async function getPlaybackUrl(recording: Recording): Promise<string> {
  return createSignedUrl("interview-recordings", recording.storage_path, 120);
}

/** Signed URL for the candidate's own CV/photo thumbnail (own-folder RLS). */
export async function getOwnFileUrl(bucket: string, path: string): Promise<string> {
  return createSignedUrl(bucket, path, 300);
}
