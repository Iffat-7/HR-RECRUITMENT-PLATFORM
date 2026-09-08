import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, MailCheck, ShieldCheck, UserPlus2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../../hooks/useAuth";
import { createCandidate } from "../../services/candidates";
import { listPositions } from "../../services/catalog";
import { candidateRegistrationBaseSchema, salaryConsistencyCheck } from "../../lib/validation/schemas";
import { classifyError, type AppError } from "../../lib/utils";
import { Button, Card } from "../../components/ui/core";
import { CheckboxInput, Field, SelectInput, TextInput } from "../../components/ui/fields";
import { ErrorState, useToast } from "../../components/ui/feedback";
import type { Position } from "../../types";

const schema = candidateRegistrationBaseSchema
  .extend({
    password: z.string().min(8, "At least 8 characters").optional().or(z.literal("")),
  })
  .refine(salaryConsistencyCheck, {
    message: "Expected salary should not be below current salary",
    path: ["expected_salary"],
  });
type FormInput = z.infer<typeof schema>;

export default function CandidateRegister() {
  const { user, profile, candidate, refreshIdentity } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsError, setPositionsError] = useState<AppError | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailConfirm, setEmailConfirm] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormInput>({ resolver: zodResolver(schema) });

  // Pre-fill from Google / existing profile (read-only fields)
  useEffect(() => {
    if (user?.email) setValue("email", user.email);
    if (profile?.full_name) setValue("full_name", profile.full_name);
  }, [user, profile, setValue]);

  useEffect(() => {
    listPositions(true)
      .then(setPositions)
      .catch((e) => setPositionsError(classifyError(e)));
  }, []);

  // Already registered → nothing to do here
  useEffect(() => {
    if (candidate) navigate("/candidate", { replace: true });
  }, [candidate, navigate]);

  const onSubmit = async (input: FormInput) => {
    setBusy(true);
    try {
      let userId = user?.id ?? null;

      if (!userId) {
        if (!input.password || input.password.length < 8) {
          setError("password", { message: "Create a password of at least 8 characters" });
          setBusy(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: { data: { full_name: input.full_name } },
        });
        if (error) throw error;
        if (!data.session || !data.user) {
          setEmailConfirm(input.email);
          setBusy(false);
          return;
        }
        userId = data.user.id;
      }

      const created = await createCandidate(input, userId);
      push("success", `Registered — your reference code is ${created.reference_code}.`);
      await refreshIdentity();
      navigate("/candidate");
    } catch (e) {
      const err = classifyError(e);
      if (err.message.toLowerCase().includes("already registered")) {
        setError("email", { message: "This email is already registered — sign in instead." });
      } else {
        push("error", err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  if (emailConfirm) {
    return (
      <div className="mx-auto max-w-xl animate-fade-up">
        <Card className="p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-100 text-success-600">
            <MailCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-ink-900">Confirm your email</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            We sent a confirmation link to <span className="font-semibold text-ink-900">{emailConfirm}</span>. After
            confirming, sign in again and you'll finish your registration here — your details were not lost.
          </p>
          <Button className="mt-5" onClick={() => navigate("/login")}>
            Go to sign in
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="animate-fade-up">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-700">Step 1 — Registration</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900">
          {user ? "Complete your candidate profile" : "Create your candidate account"}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          Everything you enter is validated twice — here and again by the database. Fields marked{" "}
          <span className="font-semibold text-danger-600">*</span> are required.
        </p>
      </div>

      {positionsError && (
        <div className="mt-5">
          <ErrorState error={positionsError} compact onRetry={() => listPositions(true).then(setPositions).catch((e) => setPositionsError(classifyError(e)))} />
        </div>
      )}

      <Card className="mt-6 p-6 sm:p-7 animate-fade-up [animation-delay:80ms]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {!user && (
            <fieldset className="rounded-xl border border-line bg-paper/60 p-4">
              <legend className="px-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-400">Account</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" required error={errors.email?.message}>
                  <TextInput type="email" autoComplete="email" placeholder="you@example.com" invalid={!!errors.email} {...register("email")} />
                </Field>
                <Field label="Password" required error={errors.password?.message} hint="min 8 characters">
                  <TextInput type="password" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
                </Field>
              </div>
            </fieldset>
          )}

          <fieldset className="rounded-xl border border-line p-4">
            <legend className="px-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-400">Personal details</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required error={errors.full_name?.message}>
                <TextInput
                  placeholder="e.g. Ayesha Khan"
                  autoComplete="name"
                  readOnly={!!profile?.full_name}
                  className={profile?.full_name ? "bg-ink-900/4 text-ink-500" : undefined}
                  invalid={!!errors.full_name}
                  {...register("full_name")}
                />
              </Field>
              <Field label="Father / Husband name" error={errors.father_husband_name?.message}>
                <TextInput placeholder="Optional" {...register("father_husband_name")} />
              </Field>
              <Field label="Mobile" required error={errors.mobile?.message}>
                <TextInput placeholder="0300-1234567" inputMode="tel" invalid={!!errors.mobile} {...register("mobile")} />
              </Field>
              <Field label="Email" required error={errors.email?.message}>
                <TextInput
                  type="email"
                  placeholder="you@example.com"
                  readOnly={!!user}
                  className={user ? "bg-ink-900/4 text-ink-500" : undefined}
                  invalid={!!errors.email}
                  {...register("email")}
                />
              </Field>
              <Field label="City" required error={errors.city?.message}>
                <TextInput placeholder="e.g. Lahore" invalid={!!errors.city} {...register("city")} />
              </Field>
              <Field label="CNIC" required error={errors.cnic?.message} hint="12345-1234567-1">
                <TextInput placeholder="12345-1234567-1" inputMode="numeric" invalid={!!errors.cnic} {...register("cnic")} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-line p-4">
            <legend className="px-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-400">Application</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Position applying for" required error={errors.position_id?.message}>
                <SelectInput invalid={!!errors.position_id} defaultValue="" {...register("position_id")}>
                  <option value="" disabled>
                    {positionsError ? "Positions unavailable" : "Select a position…"}
                  </option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                      {p.department ? ` — ${p.department}` : ""}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Years of experience" required error={errors.years_of_experience?.message}>
                <TextInput type="number" min={0} max={60} placeholder="e.g. 4" invalid={!!errors.years_of_experience} {...register("years_of_experience")} />
              </Field>
              <Field label="Current employer" error={errors.current_employer?.message}>
                <TextInput placeholder="Optional" {...register("current_employer")} />
              </Field>
              <Field label="Notice period" error={errors.notice_period?.message}>
                <TextInput placeholder="e.g. 30 days" {...register("notice_period")} />
              </Field>
              <Field label="Current salary (PKR/month)" error={typeof errors.current_salary?.message === "string" ? errors.current_salary.message : undefined}>
                <TextInput type="number" min={0} placeholder="Optional" {...register("current_salary")} />
              </Field>
              <Field label="Expected salary (PKR/month)" error={typeof errors.expected_salary?.message === "string" ? errors.expected_salary.message : undefined}>
                <TextInput type="number" min={0} placeholder="Optional" {...register("expected_salary")} />
              </Field>
              <Field label="Available to join" error={errors.available_joining_date?.message}>
                <TextInput type="date" {...register("available_joining_date")} />
              </Field>
            </div>
          </fieldset>

          <div className={`rounded-xl border p-4 ${errors.consent_given ? "border-danger-600/50 bg-danger-100/40" : "border-line bg-paper/60"}`}>
            <label className="flex cursor-pointer items-start gap-3">
              <CheckboxInput className="mt-0.5" invalid={!!errors.consent_given} {...register("consent_given")} />
              <span className="text-[13px] leading-relaxed text-ink-700">
                I confirm the information above is accurate and I consent to TalentGate processing my data — including
                CV, profile photo and future interview recordings — for recruitment purposes only.{" "}
                <span className="font-semibold text-danger-600">*</span>
              </span>
            </label>
            {errors.consent_given && <p className="mt-2 pl-7 text-xs font-medium text-danger-600">{errors.consent_given.message}</p>}
          </div>

          <Button type="submit" className="w-full" loading={busy} icon={<UserPlus2 className="h-4 w-4" />}>
            {busy ? "Submitting…" : user ? "Complete registration" : "Create account & register"}
          </Button>
        </form>
      </Card>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-line bg-white px-4 py-3.5 animate-fade-up [animation-delay:140ms]">
        <ShieldCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-success-600" />
        <p className="text-[12.5px] leading-relaxed text-ink-500">
          Stored with a randomly generated reference code — never a sequential ID — so nobody can guess how many
          candidates exist. Your CNIC is masked in every HR view.
        </p>
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
      </div>
    </div>
  );
}
