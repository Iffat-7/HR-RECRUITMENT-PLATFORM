/** Domain types for TalentGate V1.1 — mirrors supabase/migrations/0001_foundation.sql */

export type RoleName = "HR" | "CANDIDATE";

export type ResponseType = "VIDEO" | "AUDIO" | "VIDEO_OR_AUDIO";

export type CandidateStatus =
  | "NEW"
  | "SCREENING"
  | "INTERVIEW"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";

export type ApplicationStatus =
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_IN_PROGRESS"
  | "INTERVIEW_SUBMITTED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "REJECTED"
  | "OFFER_EXTENDED"
  | "HIRED"
  | "WITHDRAWN";

export type InterviewStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SUBMITTED"
  | "EXPIRED"
  | "CANCELLED";

export type InterviewQuestionStatus =
  | "PENDING"
  | "PREPARING"
  | "RECORDING"
  | "REVIEWING"
  | "UPLOADING"
  | "COMPLETED"
  | "FAILED"
  | "RECORDED"
  | "SKIPPED";

export type RecordingStatus =
  | "UPLOADING"
  | "UPLOADED"
  | "PROCESSING"
  | "TRANSCRIBED"
  | "FAILED"
  | "DELETED"
  | "SUPERSEDED";

export type Recommendation =
  | "STRONG_HIRE"
  | "HIRE"
  | "MAYBE"
  | "NO_HIRE"
  | "STRONG_NO_HIRE";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleGrant {
  id: string;
  user_id: string;
  role_id: string;
  granted_by: string | null;
  granted_at: string;
  roles?: Pick<Role, "name"> | null;
}

export interface Role {
  id: string;
  name: RoleName;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Candidate {
  id: string;
  reference_code: string;
  user_id: string | null;
  full_name: string;
  father_husband_name: string | null;
  mobile: string;
  email: string | null;
  city: string | null;
  cnic: string | null;
  position_id: string | null;
  years_of_experience: number | null;
  current_employer: string | null;
  current_salary: number | null;
  expected_salary: number | null;
  notice_period: string | null;
  available_joining_date: string | null;
  cv_path: string | null;
  profile_photo_path: string | null;
  consent_given: boolean;
  consent_timestamp: string | null;
  status: CandidateStatus;
  created_at: string;
  updated_at: string;
  positions?: Pick<Position, "id" | "title" | "department"> | null;
}

export interface Position {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  candidate_id: string;
  position_id: string;
  status: ApplicationStatus;
  applied_at: string;
  updated_at: string;
  positions?: Pick<Position, "id" | "title" | "department"> | null;
}

export interface Question {
  id: string;
  question_text: string;
  category: string | null;
  response_type: ResponseType;
  maximum_duration_seconds: number;
  preparation_time_seconds: number;
  maximum_retakes: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionSet {
  id: string;
  name: string;
  description: string | null;
  position_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  positions?: Pick<Position, "id" | "title"> | null;
}

export interface QuestionSetQuestion {
  question_set_id: string;
  question_id: string;
  display_order: number;
  questions?: Question | null;
}

export interface Interview {
  id: string;
  candidate_id: string;
  application_id: string | null;
  status: InterviewStatus;
  started_at: string | null;
  completed_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestion {
  id: string;
  interview_id: string;
  question_id: string | null;
  question_text_snapshot: string;
  response_type_snapshot: ResponseType;
  maximum_duration_seconds: number;
  preparation_time_seconds: number;
  maximum_retakes: number;
  is_required: boolean;
  display_order: number;
  status: InterviewQuestionStatus;
  created_at: string;
  updated_at: string;
}

/** V1.2 — recordings table foundation exists in the database; no uploads yet. */
export interface Recording {
  id: string;
  interview_question_id: string;
  candidate_id: string;
  storage_path: string;
  file_type: "VIDEO" | "AUDIO";
  mime_type: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  attempt_number: number;
  status: RecordingStatus;
  created_at: string;
  uploaded_at: string | null;
}

export interface EvaluationCategory {
  id: string;
  name: string;
  description: string | null;
  min_score: number;
  max_score: number;
  sort_order: number;
  is_active: boolean;
}

export interface Evaluation {
  id: string;
  candidate_id: string;
  interview_id: string | null;
  reviewer_id: string;
  overall_score: number;
  recommendation: Recommendation;
  notes: string | null;
  created_at: string;
  updated_at: string;
  candidates?: Pick<Candidate, "id" | "full_name" | "reference_code"> | null;
  profiles?: Pick<Profile, "id" | "full_name"> | null;
  evaluation_scores?: EvaluationScore[];
}

export interface EvaluationScore {
  id: string;
  evaluation_id: string;
  category_id: string;
  score: number;
  evaluation_categories?: Pick<EvaluationCategory, "id" | "name" | "max_score"> | null;
}

export interface StatusHistoryEntry {
  id: string;
  candidate_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
  profiles?: Pick<Profile, "id" | "full_name"> | null;
}

export interface AuditLog {
  id: number;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_email?: string | null;
}

/* ---------- Label & tone maps (single source of truth for UI) ---------- */

export const CANDIDATE_STATUSES: CandidateStatus[] = [
  "NEW",
  "SCREENING",
  "INTERVIEW",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
];

export const RESPONSE_TYPES: ResponseType[] = ["VIDEO", "AUDIO", "VIDEO_OR_AUDIO"];

export const QUESTION_CATEGORIES = [
  "GENERAL",
  "BEHAVIORAL",
  "TECHNICAL",
  "SITUATIONAL",
  "COMMUNICATION",
  "MOTIVATION",
] as const;

export const RECOMMENDATIONS: Recommendation[] = [
  "STRONG_HIRE",
  "HIRE",
  "MAYBE",
  "NO_HIRE",
  "STRONG_NO_HIRE",
];

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  STRONG_HIRE: "Strong hire",
  HIRE: "Hire",
  MAYBE: "Maybe",
  NO_HIRE: "No hire",
  STRONG_NO_HIRE: "Strong no-hire",
};

export const INTERVIEW_STATUSES: InterviewStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "SUBMITTED",
  "EXPIRED",
  "CANCELLED",
];

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export const STATUS_TONES: Record<string, StatusTone> = {
  NEW: "info",
  SCREENING: "info",
  INTERVIEW: "warning",
  UNDER_REVIEW: "warning",
  SHORTLISTED: "success",
  OFFER: "success",
  HIRED: "success",
  REJECTED: "danger",
  WITHDRAWN: "neutral",
  APPLIED: "info",
  INTERVIEW_SCHEDULED: "warning",
  INTERVIEW_IN_PROGRESS: "warning",
  INTERVIEW_SUBMITTED: "info",
  OFFER_EXTENDED: "success",
  NOT_STARTED: "neutral",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  SUBMITTED: "success",
  EXPIRED: "danger",
  CANCELLED: "danger",
  PENDING: "neutral",
  PREPARING: "warning",
  RECORDING: "danger",
  REVIEWING: "info",
  RECORDED: "success",
  SKIPPED: "neutral",
  SUPERSEDED: "neutral",
  VIDEO: "info",
  AUDIO: "warning",
  VIDEO_OR_AUDIO: "neutral",
  UPLOADING: "warning",
  UPLOADED: "success",
  PROCESSING: "warning",
  TRANSCRIBED: "success",
  FAILED: "danger",
  DELETED: "neutral",
  STRONG_HIRE: "success",
  HIRE: "success",
  MAYBE: "warning",
  NO_HIRE: "danger",
  STRONG_NO_HIRE: "danger",
  HR: "info",
  CANDIDATE: "success",
};

export const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  UNDER_REVIEW: "Under review",
  SHORTLISTED: "Shortlisted",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  APPLIED: "Applied",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  INTERVIEW_IN_PROGRESS: "Interview in progress",
  INTERVIEW_SUBMITTED: "Interview submitted",
  OFFER_EXTENDED: "Offer extended",
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  PENDING: "Pending",
  PREPARING: "Preparing",
  RECORDING: "Recording",
  REVIEWING: "Reviewing",
  UPLOADING: "Uploading",
  FAILED: "Failed",
  SKIPPED: "Skipped",
  RECORDED: "Recorded",
  COMPLETED: "Completed",
  SUBMITTED: "Submitted",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  SUPERSEDED: "Retaken",
  VIDEO: "Video",
  AUDIO: "Audio",
  VIDEO_OR_AUDIO: "Video or audio",
  VIDEO_OR_AUDIO_SHORT: "Video / audio",
};
