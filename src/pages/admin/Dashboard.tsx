import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Clapperboard,
  ClipboardCheck,
  ShieldCheck,
  UsersRound,
  Video,
  ArrowRight,
} from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { listCandidates } from "../../services/candidates";
import { classifyError, timeAgo, type AppError } from "../../lib/utils";
import { Badge, Card, Skeleton, StatusBadge } from "../../components/ui/core";
import { ErrorState } from "../../components/ui/feedback";
import { PageHeader } from "../../components/shared";
import { CANDIDATE_STATUSES, type Candidate, type CandidateStatus } from "../../types";

interface Stats {
  candidates: number;
  positions: number;
  questions: number;
  questionSets: number;
  interviews: number;
  evaluations: number;
}

async function count(table: string): Promise<number> {
  const { count, error } = await supabase.from(table).select("id", { head: true, count: "exact" });
  if (error) throw classifyError(error);
  return count ?? 0;
}

const STAT_CARDS: { key: keyof Stats; label: string; to: string; icon: React.ReactNode }[] = [
  { key: "candidates", label: "Candidates", to: "/admin/candidates", icon: <UsersRound className="h-4.5 w-4.5" /> },
  { key: "positions", label: "Open positions", to: "/admin/positions", icon: <Briefcase className="h-4.5 w-4.5" /> },
  { key: "questions", label: "Questions", to: "/admin/questions", icon: <Clapperboard className="h-4.5 w-4.5" /> },
  { key: "questionSets", label: "Question sets", to: "/admin/question-sets", icon: <ClipboardCheck className="h-4.5 w-4.5" /> },
  { key: "interviews", label: "Interviews", to: "/admin/candidates", icon: <Video className="h-4.5 w-4.5" /> },
  { key: "evaluations", label: "Evaluations", to: "/admin/evaluations", icon: <ShieldCheck className="h-4.5 w-4.5" /> },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Candidate[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cand, pos, qs, qsets, ints, evals, latest] = await Promise.all([
        count("candidates"),
        count("positions"),
        count("questions"),
        count("question_sets"),
        count("interviews"),
        count("evaluations"),
        listCandidates({ pageSize: 6 }),
      ]);
      setStats({ candidates: cand, positions: pos, questions: qs, questionSets: qsets, interviews: ints, evaluations: evals });
      setRecent(latest.rows);
      const grouped: Record<string, number> = {};
      latest.rows.forEach((r) => (grouped[r.status] = (grouped[r.status] ?? 0) + 1));
      setByStatus(grouped);
    } catch (e) {
      setError(classifyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = Object.values(byStatus).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live state of the recruitment pipeline. Data is fetched from PostgreSQL with role-based Row Level Security."
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Dashboard" }]}
      />

      {error && <ErrorState error={error} onRetry={load} />}

      {loading && !error && (
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !error && stats && (
        <div className="animate-fade-up">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {STAT_CARDS.map((s, i) => (
              <Link key={s.key} to={s.to} className="group">
                <Card className="h-full p-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary-300 group-hover:shadow-lift">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                    {s.icon}
                  </span>
                  <p className="mt-3 font-display text-[26px] leading-none font-bold text-ink-900">
                    {stats[s.key]}
                  </p>
                  <p className="mt-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-400">
                    {s.label}
                  </p>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            {/* Recent candidates */}
            <Card className="lg:col-span-3">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="font-display text-[15px] font-bold text-ink-900">Recent candidates</h2>
                <Link to="/admin/candidates" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-700 transition-colors hover:text-primary-800">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-ink-400">
                  No candidates yet — they appear here the moment someone registers through the candidate portal.
                </p>
              ) : (
                <ul>
                  {recent.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/admin/candidates/${c.id}`}
                        className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-3 transition-colors last:border-0 hover:bg-primary-50/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-ink-900">{c.full_name}</p>
                          <p className="font-mono text-[10.5px] tracking-wider text-ink-400">
                            {c.reference_code} · {c.positions?.title ?? "No position"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <StatusBadge status={c.status} />
                          <span className="hidden font-mono text-[10.5px] text-ink-400 sm:block">{timeAgo(c.created_at)}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Pipeline snapshot */}
            <Card className="lg:col-span-2">
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-display text-[15px] font-bold text-ink-900">Pipeline snapshot</h2>
                <p className="mt-0.5 text-xs text-ink-400">Latest registrations by stage</p>
              </div>
              <div className="space-y-3 px-5 py-4">
                {CANDIDATE_STATUSES.map((st: CandidateStatus) => {
                  const n = byStatus[st] ?? 0;
                  if (n === 0) return null;
                  return (
                    <div key={st}>
                      <div className="flex items-center justify-between">
                        <StatusBadge status={st} />
                        <span className="font-mono text-[11px] font-semibold text-ink-700">{n}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-900/6">
                        <div
                          className="h-full rounded-full bg-primary-500 transition-all duration-700"
                          style={{ width: `${Math.max(6, (n / total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(byStatus).length === 0 && (
                  <p className="py-6 text-center text-sm text-ink-400">No pipeline activity yet.</p>
                )}
              </div>
              <div className="border-t border-line px-5 py-3.5">
                <Badge tone="info" dot>
                  Foundation milestone
                </Badge>
                <p className="mt-2 text-xs leading-relaxed text-ink-500">
                  The recording pipeline (V1.2) will surface in-progress interviews and upload health here.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
