import { useEffect, useState } from "react";
import { Database, HardDrive, KeyRound, Server, ShieldCheck } from "lucide-react";
import { runHealthChecks, environmentSummary, type HealthCheck } from "../../services/system";
import { supabaseAnonKey } from "../../lib/supabase/client";
import { maskKey } from "../../lib/utils";
import { Badge, Card, Skeleton } from "../../components/ui/core";
import { PageHeader, CopyChip, DefRow } from "../../components/shared";

function StateBadge({ state }: { state: HealthCheck["state"] }) {
  if (state === "checking") return <Badge tone="neutral" dot>checking</Badge>;
  if (state === "operational") return <Badge tone="success" dot>operational</Badge>;
  if (state === "pending") return <Badge tone="warning" dot>setup needed</Badge>;
  return <Badge tone="danger" dot>error</Badge>;
}

const SECURITY_NOTES = [
  "Only the anon key ships to the browser — it's designed to be public.",
  "The service-role key is never referenced anywhere in this codebase.",
  "All tables run with Row Level Security enabled; policies are role-aware.",
  "Storage buckets are private — HR playback will use expiring signed URLs.",
  "Audit entries never store passwords, tokens or full CNIC numbers.",
  "Candidate reference codes are random (non-sequential) — no count leakage.",
];

export default function Settings() {
  const [checks, setChecks] = useState<HealthCheck[] | null>(null);
  const env = environmentSummary();

  useEffect(() => {
    let live = true;
    runHealthChecks().then((r) => live && setChecks(r));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Environment, platform health and the security posture of this V1.1 foundation."
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Settings" }]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Platform health */}
        <Card className="p-5 animate-fade-up">
          <h2 className="mb-4 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
            <Server className="h-4 w-4 text-primary-600" /> Platform health
          </h2>
          {!checks ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <ul className="space-y-2.5">
              {checks.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink-900">{c.label}</p>
                    <p className="truncate font-mono text-[10.5px] text-ink-400">{c.detail}</p>
                  </div>
                  <StateBadge state={c.state} />
                </li>
              ))}
            </ul>
          )}
          {checks?.some((c) => c.state === "pending") && (
            <div className="mt-4 rounded-lg border border-warning-600/25 bg-warning-100/60 px-4 py-3 text-[12.5px] leading-relaxed text-warning-700">
              Run <span className="font-mono font-semibold">supabase/migrations/0001_foundation.sql</span> in the Supabase SQL
              editor to finish the setup. Full instructions are in README.md.
            </div>
          )}
        </Card>

        {/* Environment */}
        <Card className="p-5 animate-fade-up [animation-delay:80ms]">
          <h2 className="mb-4 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
            <KeyRound className="h-4 w-4 text-primary-600" /> Environment
          </h2>
          <dl>
            <DefRow label="Supabase project">
              <CopyChip value={env.projectRef} label="project ref" />
            </DefRow>
            <DefRow label="API URL">
              <span className="break-all font-mono text-xs">{env.url}</span>
            </DefRow>
            <DefRow label="Anon key (public)">
              <span className="font-mono text-xs">{maskKey(supabaseAnonKey)}</span>
            </DefRow>
            <DefRow label="Service role key">
              <span className="inline-flex items-center gap-1.5 font-semibold text-success-700">
                <ShieldCheck className="h-3.5 w-3.5" /> not present in this codebase
              </span>
            </DefRow>
            <DefRow label="Env vars">
              <span className="font-mono text-xs">VITE_SUPABASE_URL · VITE_SUPABASE_ANON_KEY</span>
            </DefRow>
          </dl>
        </Card>

        {/* Storage */}
        <Card className="p-5 animate-fade-up [animation-delay:140ms]">
          <h2 className="mb-4 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
            <HardDrive className="h-4 w-4 text-primary-600" /> Private storage buckets
          </h2>
          <ul className="space-y-2.5">
            {[
              { name: "candidate-cvs", desc: "PDF/DOC resumes · 10 MB limit · owner + HR read" },
              { name: "candidate-profile-photos", desc: "JPEG/PNG/WEBP · 5 MB limit · owner + HR read" },
              { name: "interview-recordings", desc: "WebM/MP4 captures · 200 MB limit · no public URLs, ever" },
            ].map((b) => (
              <li key={b.name} className="flex items-start justify-between gap-3 rounded-lg border border-line px-3.5 py-3">
                <div>
                  <p className="font-mono text-[12.5px] font-semibold text-ink-900">{b.name}</p>
                  <p className="mt-0.5 text-xs text-ink-400">{b.desc}</p>
                </div>
                <Badge tone="neutral">private</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            Uploads are not wired yet (V1.2) — the buckets and their RLS policies are created by the foundation migration.
          </p>
        </Card>

        {/* Security posture */}
        <Card className="p-5 animate-fade-up [animation-delay:200ms]">
          <h2 className="mb-4 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
            <Database className="h-4 w-4 text-primary-600" /> Security posture
          </h2>
          <ul className="space-y-2.5">
            {SECURITY_NOTES.map((n) => (
              <li key={n} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
                {n}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-paper px-3.5 py-2.5 text-[11.5px] leading-relaxed text-ink-500">
            This foundation follows secure defaults but has not been penetration-tested — don't claim otherwise in production reviews.
          </p>
        </Card>
      </div>
    </div>
  );
}
