import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, ScrollText, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { loginSchema, type LoginInput } from "../../lib/validation/schemas";
import { useAuth } from "../../hooks/useAuth";
import { Button, Logo } from "../../components/ui/core";
import { Field, TextInput } from "../../components/ui/fields";
import { classifyError } from "../../lib/utils";
import type { AppError } from "../../lib/utils";

export default function Login() {
  const { user, isHr, candidate, initializing, roles } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<AppError | null>(null);
  const [verifying, setVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  // Route once identity is known
  useEffect(() => {
    if (initializing || !user) return;
    if (isHr) navigate("/admin", { replace: true });
    else if (candidate) navigate("/candidate", { replace: true });
  }, [initializing, user, isHr, candidate, navigate]);

  const onSubmit = async (input: LoginInput) => {
    setServerError(null);
    setVerifying(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error) throw error;
      // onAuthStateChange triggers the redirect effect above.
    } catch (e) {
      setServerError(classifyError(e));
      setVerifying(false);
    }
  };

  const noRole = !initializing && user && !isHr && !candidate;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-navy-900 navy-texture lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary-600/20 blur-3xl" />
        <Link to="/" aria-label="Back to home">
          <Logo dark />
        </Link>
        <div className="relative max-w-md">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-300">HR Console</p>
          <h1 className="mt-4 font-display text-4xl leading-tight font-bold tracking-tight text-white">
            Review candidates like an auditor, not a gambler.
          </h1>
          <ul className="mt-8 space-y-4">
            {[
              { icon: <ShieldCheck className="h-4 w-4" />, text: "Role-based access — SUPER_ADMIN, ADMIN, RECRUITER, REVIEWER — checked in PostgreSQL, not just the UI." },
              { icon: <Lock className="h-4 w-4" />, text: "Candidate recordings live in private buckets and are played back through expiring signed URLs." },
              { icon: <ScrollText className="h-4 w-4" />, text: "Every status change and evaluation lands in an immutable audit trail." },
            ].map((b) => (
              <li key={b.text} className="flex items-start gap-3 text-[13.5px] leading-relaxed text-navy-200">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-700 text-primary-300">{b.icon}</span>
                {b.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="font-mono text-[10.5px] tracking-wide text-navy-300">TalentGate V1.1 — foundation milestone</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-paper px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm animate-fade-up">
          <Link to="/" className="mb-8 inline-block lg:hidden">
            <Logo />
          </Link>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">Sign in to the HR console</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            Use the credentials provisioned by your Super Admin via Supabase Auth.
          </p>

          {serverError && (
            <div role="alert" className="mt-5 rounded-lg border border-danger-600/25 bg-danger-100/70 px-4 py-3 text-[13px] font-medium text-danger-700">
              {serverError.message}
            </div>
          )}
          {noRole && (
            <div role="status" className="mt-5 rounded-lg border border-warning-600/25 bg-warning-100/70 px-4 py-3 text-[13px] leading-relaxed font-medium text-warning-700">
              Signed in, but no role is assigned to this account{roles.length === 0 ? "" : ` (${roles.join(", ")})`}.
              Ask a Super Admin to grant you a role under Team &amp; Roles.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Field label="Work email" required error={errors.email?.message}>
              <TextInput
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                invalid={!!errors.email}
                {...register("email")}
              />
            </Field>
            <Field label="Password" required error={errors.password?.message}>
              <TextInput
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                invalid={!!errors.password}
                {...register("password")}
              />
            </Field>
            <Button type="submit" className="w-full" loading={verifying || initializing} icon={<ArrowRight className="h-4 w-4" />}>
              {verifying ? "Verifying…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-line bg-white px-4 py-3.5">
            <p className="text-[12.5px] leading-relaxed text-ink-500">
              Taking an interview?{" "}
              <Link to="/candidate" className="font-semibold text-primary-700 underline-offset-2 hover:underline">
                Enter the candidate portal
              </Link>{" "}
              — no HR account needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
