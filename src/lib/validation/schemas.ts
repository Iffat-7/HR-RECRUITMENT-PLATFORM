import { z } from "zod";

/**
 * Zod schemas — the single source of truth for validation.
 * Used by React Hook Form on the client AND by the CHECK constraints /
 * SECURITY DEFINER functions in the database, so invalid data is rejected
 * at both layers (never client-side only).
 */

const uuid = z.string().uuid("Invalid identifier");

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

const cnicRegex = /^\d{5}-\d{7}-\d$/;
const mobileRegex = /^(\+?\d{1,3}[- ]?)?\(?\d{2,4}\)?[- ]?\d{6,8}$/;

export function salaryConsistencyCheck(v: {
  current_salary?: unknown;
  expected_salary?: unknown;
}): boolean {
  return (
    v.expected_salary == null ||
    v.expected_salary === "" ||
    v.current_salary == null ||
    v.current_salary === "" ||
    Number(v.expected_salary) >= Number(v.current_salary)
  );
}

export const candidateRegistrationBaseSchema = z
  .object({
    full_name: z.string().trim().min(3, "Full name is required").max(120),
    father_husband_name: z.string().trim().max(120).optional().or(z.literal("")),
    mobile: z
      .string()
      .trim()
      .regex(mobileRegex, "Enter a valid mobile number, e.g. 0300-1234567"),
    email: z.string().trim().email("Enter a valid email address"),
    city: z.string().trim().min(2, "City is required").max(80),
    cnic: z
      .string()
      .trim()
      .regex(cnicRegex, "CNIC format: 12345-1234567-1"),
    position_id: z
      .string()
      .min(1, "Select the position you're applying for")
      .uuid("Select the position you're applying for"),
    years_of_experience: z.coerce.number({ invalid_type_error: "Required" }).min(0).max(60),
    current_employer: z.string().trim().max(120).optional().or(z.literal("")),
    current_salary: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .min(0, "Cannot be negative")
      .nullable()
      .optional()
      .or(z.literal("")),
    expected_salary: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .min(0, "Cannot be negative")
      .nullable()
      .optional()
      .or(z.literal("")),
    notice_period: z.string().trim().max(60).optional().or(z.literal("")),
    available_joining_date: z.string().optional().or(z.literal("")),
    consent_given: z.literal(true, {
      errorMap: () => ({ message: "You must give consent to be considered" }),
    }),
  });

export const candidateRegistrationSchema = candidateRegistrationBaseSchema.refine(salaryConsistencyCheck, {
  message: "Expected salary should not be below current salary",
  path: ["expected_salary"],
});
export type CandidateRegistrationInput = z.infer<typeof candidateRegistrationSchema>;

export const positionSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(120),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  department: z.string().trim().max(80).optional().or(z.literal("")),
});
export type PositionInput = z.infer<typeof positionSchema>;

export const questionSchema = z.object({
  question_text: z.string().trim().min(5, "Question text is required").max(1000),
  category: z.string().trim().min(1, "Category is required").max(40),
  response_type: z.enum(["VIDEO", "AUDIO", "VIDEO_OR_AUDIO"]),
  maximum_duration_seconds: z.coerce.number().int().min(10).max(1800),
  preparation_time_seconds: z.coerce.number().int().min(0).max(600),
  maximum_retakes: z.coerce.number().int().min(0).max(10),
  is_required: z.boolean(),
  is_active: z.boolean(),
});
export type QuestionInput = z.infer<typeof questionSchema>;

export const questionSetSchema = z.object({
  name: z.string().trim().min(3, "Name is required").max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  position_id: uuid.nullable(),
});
export type QuestionSetInput = z.infer<typeof questionSetSchema>;

export const statusChangeSchema = z.object({
  new_status: z.string().min(1, "Select a status"),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;

export const evaluationSchema = z.object({
  candidate_id: z.string().min(1, "Select a candidate").uuid("Select a candidate"),
  interview_id: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    uuid.nullable()
  ),
  overall_score: z.coerce.number().min(0).max(100),
  recommendation: z.enum([
    "STRONG_HIRE",
    "HIRE",
    "MAYBE",
    "NO_HIRE",
    "STRONG_NO_HIRE",
  ]),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});
export type EvaluationInput = z.infer<typeof evaluationSchema>;

/** Score per category — bounds are validated again against category.max_score server-side. */
export const categoryScoreSchema = z.object({
  category_id: uuid,
  score: z.coerce.number().min(0).max(10),
});

export const roleGrantSchema = z.object({
  user_id: uuid,
  role_id: uuid,
});
