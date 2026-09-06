import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, UsersRound } from "lucide-react";
import { listCandidates } from "../../services/candidates";
import { classifyError, formatDate, type AppError } from "../../lib/utils";
import { Button, Card, Skeleton, StatusBadge } from "../../components/ui/core";
import { EmptyState, ErrorState } from "../../components/ui/feedback";
import { SelectInput, TextInput } from "../../components/ui/fields";
import { PageHeader, CopyChip } from "../../components/shared";
import { CANDIDATE_STATUSES, type Candidate } from "../../types";

const PAGE_SIZE = 12;

export default function Candidates() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Candidate[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCandidates({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: status || null,
      });
      setRows(res.rows);
      setCount(res.count);
    } catch (e) {
      setError(classifyError(e));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const t = window.setTimeout(load, 280);
    return () => window.clearTimeout(t);
  }, [load]);

  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Candidates"
        description="Everyone who registered through the candidate portal. Access to these records is restricted by RLS to HR roles."
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Candidates" }]}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5 animate-fade-up">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <TextInput
            placeholder="Search name, reference, email, mobile…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            aria-label="Search candidates"
          />
        </div>
        <SelectInput
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className="w-44"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {CANDIDATE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </SelectInput>
        <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-ink-400">
          {loading ? "…" : `${count} record${count === 1 ? "" : "s"}`}
        </span>
      </div>

      {error && <ErrorState error={error} onRetry={load} />}

      {loading && !error && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={<UsersRound className="h-5.5 w-5.5" />}
          title={search || status ? "No candidates match your filters" : "No candidates yet"}
          body={
            search || status
              ? "Try a different search term or clear the status filter."
              : "When a candidate registers at /candidate/register they appear here instantly — no hardcoded demo data."
          }
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <Card className="overflow-hidden animate-fade-up">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-line bg-paper/70">
                  {["Reference", "Candidate", "Position", "Mobile", "Status", "Registered"].map((h) => (
                    <th key={h} className="px-4 py-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    className="group cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-primary-50/50"
                    onClick={() => navigate(`/admin/candidates/${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <CopyChip value={c.reference_code} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13.5px] font-semibold text-ink-900 group-hover:text-primary-700">{c.full_name}</p>
                      <p className="text-xs text-ink-400">{c.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink-700">{c.positions?.title ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-700">{c.mobile}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-500">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} icon={<ChevronLeft className="h-3.5 w-3.5" />}>
                Previous
              </Button>
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-400">
                Page {page + 1} / {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
