import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ScrollText, Search } from "lucide-react";
import { listAuditLogs, type AuditFilters } from "../../services/admin";
import { classifyError, formatDateTime, type AppError } from "../../lib/utils";
import { Badge, Button, Card, Skeleton } from "../../components/ui/core";
import { EmptyState, ErrorState } from "../../components/ui/feedback";
import { SelectInput, TextInput } from "../../components/ui/fields";
import { PageHeader } from "../../components/shared";
import type { AuditLog } from "../../types";

const PAGE_SIZE = 25;
const ENTITY_TYPES = ["candidate", "position", "question", "question_set", "interview", "evaluation", "role"];

export default function AuditLogs() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const f: AuditFilters = { page, pageSize: PAGE_SIZE };
      if (action) f.action = action;
      if (entity) f.entityType = entity;
      const res = await listAuditLogs(f);
      setRows(res.rows);
      setCount(res.count);
    } catch (e) {
      setError(classifyError(e));
    } finally {
      setLoading(false);
    }
  }, [page, action, entity]);

  useEffect(() => {
    const t = window.setTimeout(load, 280);
    return () => window.clearTimeout(t);
  }, [load]);

  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Audit logs"
        description="An append-only trail of meaningful actions — written by server-side database functions, never from client-side code alone. Visible to HR only."
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Audit logs" }]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-52 flex-1 sm:max-w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <TextInput
            placeholder="Filter by action…"
            className="pl-9"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
            aria-label="Filter by action"
          />
        </div>
        <SelectInput
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            setPage(0);
          }}
          className="w-44"
          aria-label="Filter by entity type"
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </SelectInput>
        <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-ink-400">
          {loading ? "…" : `${count} event${count === 1 ? "" : "s"}`}
        </span>
      </div>

      {error && <ErrorState error={error} onRetry={load} />}

      {loading && !error && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={<ScrollText className="h-5.5 w-5.5" />}
          title={count === 0 && !action && !entity ? "No events recorded yet" : "No matching events"}
          body={
            count === 0 && !action && !entity
              ? "Actions like status changes, interview creation and evaluation submissions are logged here automatically by database functions."
              : "Adjust the filters to see more events."
          }
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <Card className="overflow-hidden animate-fade-up">
          <ul>
            {rows.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-primary-50/30">
                <span className="w-36 shrink-0 font-mono text-[10.5px] text-ink-400">{formatDateTime(log.created_at)}</span>
                <Badge tone="info" className="shrink-0">{log.action}</Badge>
                <span className="font-mono text-[11px] text-ink-500">
                  {log.entity_type ?? "system"}
                  {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}…` : ""}
                </span>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <span className="ml-auto max-w-72 truncate font-mono text-[10.5px] text-ink-400" title={JSON.stringify(log.metadata)}>
                    {JSON.stringify(log.metadata)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} icon={<ChevronLeft className="h-3.5 w-3.5" />}>
                Previous
              </Button>
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-400">Page {page + 1} / {pages}</span>
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
