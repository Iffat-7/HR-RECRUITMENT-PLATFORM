import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  AudioLines,
  CheckCircle2,
  CircleDashed,
  Clapperboard,
  FileCheck2,
  Lock,
  ShieldCheck,
  TimerReset,
  UserPlus,
  Video,
} from "lucide-react";
import { Logo, Badge } from "../../components/ui/core";
import { Reveal } from "../../components/shared";
import { runHealthChecks, environmentSummary, type HealthCheck } from "../../services/system";
import { cn } from "../../lib/utils";

const PIPELINE = [
  { icon: <UserPlus className="h-4 w-4" />, label: "Register", detail: "CV + consent" },
  { icon: <Clapperboard className="h-4 w-4" />, label: "Questions", detail: "Position sets" },
  { icon: <Video className="h-4 w-4" />, label: "Record", detail: "In-browser" },
  { icon: <AudioLines className="h-4 w-4" />, label: "Review", detail: "HR scoring" },
  { icon: <FileCheck2 className="h-4 w-4" />, label: "Decide", detail: "Auditable" },
];

const SHIPPED = [
  "17-table relational schema in PostgreSQL (UUID keys, FKs, constraints)",
  "Row Level Security on every table — per-role, enforced in the database",
  "Supabase Auth foundation: sessions, protected routes, 4 HR roles",
  "Candidate model with CNIC, consent capture & non-sequential reference codes",
  "Question bank → reusable question sets with frozen interview snapshots",
  "Private storage buckets: CVs, profile photos, interview recordings",
  "Zod validation shared by forms and database constraints",
  "Audit log + status-history trail wired through SECURITY DEFINER functions",
  "In-browser recording: prep timer, hard time cap, preview, enforced retake limits",
  "CV + photo uploads with validation, progress, retry & server-side path control",
  "Interrupted-interview resume — uploaded answers survive refresh & reconnect",
  "HR playback via 2-minute signed URLs — never public links",
];

const PLANNED = [
  { v: "V1.3", items: ["AI transcription of answers", "Reviewer assist summaries (never auto-decisions)", "Reporting dashboards"] },
  { v: "V1.4", items: ["WhatsApp notifications", "n8n workflow hooks", "CRM & email integrations"] },
];

function StateDot({ state }: { state: HealthCheck["state"] }) {
  if (state === "checking")
    return <span className="h-2 w-2 animate-pulse-soft rounded-full bg-navy-300" />;
  if (state === "operational") return <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgb(52_211_153/0.8)]" />;
  if (state === "pending") return <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgb(251_191_36/0.7)]" />;
  return <span className="h-2 w-2 rounded-full bg-rose-400" />;
}

export default function Landing() {
  const [checks, setChecks] = useState<HealthCheck[]>(
    ["auth", "schema", "storage", "rls"].map((id) => ({
      id,
      label: id,
      state: "checking" as const,
      detail: "pinging…",
    }))
  );
  const [stage, setStage] = useState(0);
  const env = environmentSummary();

  useEffect(() => {
    const t = window.setInterval(() => setStage((s) => (s + 1) % PIPELINE.length), 1800);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let live = true;
    runHealthChecks().then((results) => {
      // Stagger the reveal so the console feels like it's probing live.
      results.forEach((r, i) => {
        window.setTimeout(() => {
          if (live)
            setChecks((prev) => prev.map((c) => (c.id === r.id ? r : c)));
        }, 350 + i * 420);
      });
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2" aria-label="Primary">
            <Link
              to="/candidate"
              className="rounded-lg px-3 py-2 text-[13.5px] font-semibold text-ink-700 transition-colors hover:bg-ink-900/5 hover:text-primary-700"
            >
              Candidate portal
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-[13.5px] font-semibold text-white shadow-sm shadow-primary-900/20 transition-all hover:bg-primary-700"
            >
              HR sign in
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Opening: pipeline + live console */}
      <section className="relative overflow-hidden border-b border-line grid-texture">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-white/70 to-paper" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-14 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:pt-20">
          <div className="lg:col-span-7">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-700 animate-fade-up">
              HR Recruitment OS · V1.1 foundation live
            </p>
            <h1 className="mt-4 font-display text-[40px] leading-[1.04] font-bold tracking-tight text-ink-900 sm:text-[54px] animate-fade-up [animation-delay:80ms]">
              Every interview,
              <br />
              structured. Every hire,
              <br />
              <span className="text-primary-600">defensible.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-500 animate-fade-up [animation-delay:160ms]">
              TalentGate turns recruitment into an auditable pipeline: candidates register and answer
              position-specific questions on camera, recordings land in private storage, and reviewers
              score against configurable criteria — with a full audit trail behind every decision.
            </p>

            {/* Pipeline rail */}
            <div className="mt-9 animate-fade-up [animation-delay:240ms]">
              <ol className="flex flex-wrap items-stretch gap-2" aria-label="Recruitment pipeline">
                {PIPELINE.map((p, i) => (
                  <li
                    key={p.label}
                    className={cn(
                      "relative flex min-w-28 flex-1 flex-col gap-1.5 overflow-hidden rounded-xl border px-3.5 py-3 transition-all duration-500",
                      i === stage
                        ? "border-primary-400 bg-primary-600 text-white shadow-lift -translate-y-1"
                        : "border-line bg-white text-ink-700"
                    )}
                  >
                    {i === stage && (
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/25 to-transparent animate-scan" />
                    )}
                    <span className={cn("flex items-center gap-2 text-[13px] font-bold", i === stage ? "text-white" : "text-ink-900")}>
                      {p.icon}
                      {p.label}
                    </span>
                    <span className={cn("font-mono text-[10px] uppercase tracking-wider", i === stage ? "text-primary-100" : "text-ink-400")}>
                      {p.detail}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3 animate-fade-up [animation-delay:320ms]">
              <Link
                to="/candidate/register"
                className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-navy-800 hover:shadow-lift"
              >
                Start as a candidate
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#scope"
                className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-primary-400 hover:text-primary-700"
              >
                See what's in V1.1
              </a>
            </div>
          </div>

          {/* Live system console */}
          <div className="lg:col-span-5">
            <Reveal className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-navy-700 bg-navy-900 shadow-pop navy-texture">
                <div className="flex items-center justify-between border-b border-navy-700/70 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-danger-600/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-navy-300">
                    platform console — live
                  </span>
                </div>
                <div className="space-y-1 px-3 py-3">
                  {[
                    { label: "Supabase Auth", id: "auth" },
                    { label: "PostgreSQL schema", id: "schema" },
                    { label: "Private storage", id: "storage" },
                    { label: "Row Level Security", id: "rls" },
                  ].map((row) => {
                    const c = checks.find((x) => x.id === row.id)!;
                    return (
                      <div
                        key={row.id}
                        className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-navy-800/70"
                      >
                        <StateDot state={c.state} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-white">{row.label}</p>
                          <p className="truncate font-mono text-[10.5px] text-navy-300">
                            {c.state === "checking" ? "probing endpoint…" : c.detail}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "font-mono text-[9.5px] font-bold uppercase tracking-widest",
                            c.state === "operational" && "text-emerald-400",
                            c.state === "pending" && "text-amber-400",
                            c.state === "checking" && "text-navy-300",
                            c.state === "error" && "text-rose-400"
                          )}
                        >
                          {c.state === "checking" ? "…" : c.state === "operational" ? "OK" : c.state === "pending" ? "SETUP" : "ERR"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-navy-700/70 bg-navy-950/50 px-5 py-3.5">
                  <p className="flex items-center gap-2 font-mono text-[10.5px] text-navy-300">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-primary-400" />
                    project <span className="text-white">{env.projectRef}</span> · anon key only · service role never shipped to clients
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Two portals */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-700">Two portals, one pipeline</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            A calm screen for candidates. A command deck for recruiters.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          <Reveal className="lg:col-span-3" delay={80}>
            <div className="group h-full overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className="border-b border-line bg-paper/60 px-6 py-4">
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-400">HR console — /admin</p>
              </div>
              <div className="p-6" aria-hidden="true">
                <div className="flex gap-4">
                  <div className="hidden w-32 shrink-0 space-y-1.5 rounded-xl bg-navy-900 p-2.5 sm:block">
                    {["Dashboard", "Candidates", "Positions", "Questions", "Evaluations"].map((x, i) => (
                      <div key={x} className={cn("rounded-md px-2 py-1.5 text-[10.5px] font-semibold", i === 1 ? "bg-navy-700 text-white" : "text-navy-300")}>
                        {x}
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {[
                      ["CND-8FK2MQXA", "Ayesha Khan", "SCREENING"],
                      ["CND-P3WD7Z4B", "Bilal Ahmed", "INTERVIEW"],
                      ["CND-M9QN4RT2", "Sana Tariq", "SHORTLISTED"],
                    ].map(([ref, name, st], i) => (
                      <div key={ref} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2.5 transition-colors group-hover:border-primary-200" style={{ transitionDelay: `${i * 60}ms` }}>
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-semibold text-ink-900">{name}</p>
                          <p className="font-mono text-[9.5px] tracking-wider text-ink-400">{ref}</p>
                        </div>
                        <Badge tone={st === "SHORTLISTED" ? "success" : st === "INTERVIEW" ? "warning" : "info"}>{st.toLowerCase()}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-5 text-[13.5px] leading-relaxed text-ink-500">
                  Manage positions, build question sets, move candidates through a tracked pipeline and
                  review evaluations — every action written to the audit log.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-2" delay={160}>
            <div className="group h-full overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className="border-b border-line bg-paper/60 px-6 py-4">
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-400">Candidate portal — /candidate</p>
              </div>
              <div className="p-6" aria-hidden="true">
                <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <Badge tone="info">Question 2 of 6</Badge>
                    <span className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold text-primary-700">
                      <TimerReset className="h-3.5 w-3.5" /> 30s prep
                    </span>
                  </div>
                  <p className="mt-3 text-[14px] font-semibold leading-snug text-ink-900">
                    "Walk us through a time you resolved a conflict inside your team."
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge tone="neutral">video</Badge>
                    <Badge tone="neutral">max 2 min</Badge>
                    <Badge tone="neutral">2 retakes</Badge>
                  </div>
                </div>
                <p className="mt-5 text-[13.5px] leading-relaxed text-ink-500">
                  One reassuring flow: register, read the instructions, answer on camera at your own pace.
                  Recordings upload privately — never to a public URL.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Scope ledger */}
      <section id="scope" className="border-t border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-success-700">Shipped — V1.1</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-900">The foundation is real, not a mock.</h2>
            <ul className="mt-7 space-y-3">
              {SHIPPED.map((s, i) => (
                <li key={s} className="flex items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 transition-all duration-200 hover:border-success-600/30 hover:shadow-sm">
                  <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-success-600" />
                  <span className="text-[13.5px] leading-relaxed text-ink-700">
                    <span className="mr-2 font-mono text-[10px] font-semibold text-ink-300">{String(i + 1).padStart(2, "0")}</span>
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-400">Roadmap — deliberately staged</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-900">Built in controlled milestones.</h2>
            <div className="mt-7 space-y-4">
              {PLANNED.map((p) => (
                <div key={p.v} className="rounded-xl border border-line bg-white p-5 transition-all duration-200 hover:border-primary-300 hover:shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-12 items-center justify-center rounded-lg bg-navy-900 font-mono text-[11px] font-bold text-white">{p.v}</span>
                    <CircleDashed className="h-4 w-4 text-ink-300" />
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Planned</span>
                  </div>
                  <ul className="mt-3.5 space-y-1.5">
                    {p.items.map((it) => (
                      <li key={it} className="flex items-center gap-2 text-[13.5px] text-ink-700">
                        <span className="h-1 w-1 rounded-full bg-primary-500" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-5 flex items-start gap-2 rounded-xl border border-warning-600/25 bg-warning-100/60 px-4 py-3 text-[12.5px] leading-relaxed text-warning-700">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              AI will assist reviewers — it will never be the final hiring decision-maker.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <Logo />
          <p className="font-mono text-[11px] tracking-wide text-ink-400">
            © {new Date().getFullYear()} TalentGate · Recordings private · Signed-URL playback for authorized reviewers
          </p>
        </div>
      </footer>
    </div>
  );
}
