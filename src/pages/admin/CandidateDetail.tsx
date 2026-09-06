import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CalendarCheck,
  ClipboardList,
  History,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";
import {
  getCandidateDetail,
  changeCandidateStatus,
  createInterview,
  type CandidateDetail as Detail,
} from "../../services/candidates";
import { listQuestionSets } from "../../services/catalog";
import { statusChangeSchema, type StatusChangeInput } from "../../lib/validation/schemas";
import { classifyError, formatDate, formatDateTime, formatCurrency, type AppError } from "../../lib/utils";
import { Badge, Button, Card, Skeleton, StatusBadge } from "../../components/ui/core";
import { Field, SelectInput, TextArea } from "../../components/ui/fields";
import { Modal, ErrorState, useToast } from "../../components/ui/feedback";
import { PageHeader, CopyChip, DefRow } from "../../components/shared";
import { CANDIDATE_STATUSES, type QuestionSet } from "../../types";

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);

  const [statusModal, setStatusModal] = useState(false);
  const [interviewModal, setInterviewModal] = useState(false);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await getCandidateDetail(id));
    } catch (e) {
      setError(classifyError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const statusForm = useForm<StatusChangeInput>({ resolver: zodResolver(statusChangeSchema) });
  const [selectedSet, setSelectedSet] = useState("");

  const openInterviewModal = async () => {
    setInterviewModal(true);
    try {
      setSets((await listQuestionSets()).filter((s) => s.is_active));
    } catch (e) {
      push("error", classifyError(e).message);
    }
  };

  const onSubmitStatus = async (input: StatusChangeInput) => {
    if (!id) return;
    setBusy(true);
    try {
      await changeCandidateStatus(id, input);
      push("success", "Status updated — history and audit entries recorded.");
      setStatusModal(false);
      statusForm.reset();
      load();
    } catch (e) {
      push("error", classifyError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const onSubmitInterview = async () => {
    if (!id || !selectedSet) return;
    setBusy(true);
    try {
      await createInterview(id, detail?.applications[0]?.id ?? null, selectedSet);
      push("success", "Interview created — question snapshots frozen for this candidate.");
      setInterviewModal(false);
      setSelectedSet("");
      load();
    } catch (e) {
      push("error", classifyError(e).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );

  if (error || !detail) return <ErrorState error={error ?? { kind: "not_found", message: "Candidate not found or access denied." }} onRetry={load} />;

  const c = detail.candidate;

  return (
    <div>
      <PageHeader
        title={c.full_name}
        description={c.positions?.title ? `Applying for ${c.positions.title}${c.positions.department ? ` · ${c.positions.department}` : ""}` : "No position selected yet"}
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Candidates", to: "/admin/candidates" },
          { label: c.reference_code },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setStatusModal(true)} icon={<History className="h-3.5 w-3.5" />}>
              Change status
            </Button>
            <Button size="sm" onClick={openInterviewModal} icon={<Video className="h-3.5 w-3.5" />}>
              Create interview
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2.5 animate-fade-up">
        <CopyChip value={c.reference_code} label="reference code" />
        <StatusBadge status={c.status} />
        <Badge tone="neutral">registered {formatDate(c.created_at)}</Badge>
        <Link to="/admin/candidates" className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-500 transition-colors hover:text-primary-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to list
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          {/* Profile */}
          <Card className="p-5 animate-fade-up">
            <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <UserRound className="h-4 w-4 text-primary-600" /> Profile
            </h2>
            <dl>
              <DefRow label="Father / Husband">{c.father_husband_name || "—"}</DefRow>
              <DefRow label="Email">{c.email || "—"}</DefRow>
              <DefRow label="Mobile">{c.mobile}</DefRow>
              <DefRow label="City">{c.city || "—"}</DefRow>
              <DefRow label="CNIC">
                <span className="font-mono text-[13px] tracking-wider">{c.cnic ? `${c.cnic.slice(0, 5)}-XXXXXXX-${c.cnic.slice(-1)}` : "—"}</span>
                <span className="ml-2 align-middle font-mono text-[9.5px] uppercase tracking-wider text-ink-300">masked</span>
              </DefRow>
              <DefRow label="Experience">{c.years_of_experience != null ? `${c.years_of_experience} year${c.years_of_experience === 1 ? "" : "s"}` : "—"}</DefRow>
              <DefRow label="Current employer">{c.current_employer || "—"}</DefRow>
            </dl>
          </Card>

          {/* Compensation */}
          <Card className="p-5 animate-fade-up [animation-delay:60ms]">
            <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <CalendarCheck className="h-4 w-4 text-primary-600" /> Compensation & availability
            </h2>
            <dl>
              <DefRow label="Current salary">{formatCurrency(c.current_salary)}</DefRow>
              <DefRow label="Expected salary">{formatCurrency(c.expected_salary)}</DefRow>
              <DefRow label="Notice period">{c.notice_period || "—"}</DefRow>
              <DefRow label="Available to join">{formatDate(c.available_joining_date)}</DefRow>
              <DefRow label="Consent">
                {c.consent_given ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-success-700">
                    <ShieldCheck className="h-4 w-4" /> Given {c.consent_timestamp ? `· ${formatDateTime(c.consent_timestamp)}` : ""}
                  </span>
                ) : (
                  <span className="text-danger-600">Not given</span>
                )}
              </DefRow>
            </dl>
          </Card>

          {/* Evaluations */}
          <Card className="p-5 animate-fade-up [animation-delay:120ms]">
            <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <ShieldCheck className="h-4 w-4 text-primary-600" /> Evaluations ({detail.evaluations.length})
            </h2>
            {detail.evaluations.length === 0 ? (
              <p className="text-sm text-ink-400">
                No evaluations yet. Reviewers submit them from the Evaluations module after the interview.
              </p>
            ) : (
              <ul className="space-y-3">
                {detail.evaluations.map((e) => (
                  <li key={e.id} className="rounded-lg border border-line p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={e.recommendation} />
                      <Badge tone="info">overall {e.overall_score}/100</Badge>
                      <span className="ml-auto text-xs text-ink-400">
                        {e.profiles?.full_name ?? "Reviewer"} · {formatDate(e.created_at)}
                      </span>
                    </div>
                    {e.evaluation_scores && e.evaluation_scores.length > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {e.evaluation_scores.map((s) => (
                          <div key={s.id} className="flex items-center gap-2">
                            <span className="w-36 truncate text-xs text-ink-500">{s.evaluation_categories?.name}</span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-900/6">
                              <div className="h-full rounded-full bg-primary-500" style={{ width: `${(s.score / (s.evaluation_categories?.max_score || 5)) * 100}%` }} />
                            </div>
                            <span className="font-mono text-[11px] font-semibold text-ink-700">{s.score}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {e.notes && <p className="mt-3 text-[13px] leading-relaxed text-ink-700">{e.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          {/* Interviews */}
          <Card className="p-5 animate-fade-up [animation-delay:80ms]">
            <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <Video className="h-4 w-4 text-primary-600" /> Interviews ({detail.interviews.length})
            </h2>
            {detail.interviews.length === 0 ? (
              <p className="text-sm leading-relaxed text-ink-400">
                No interview yet. Create one from an active question set — the questions are snapshotted so later edits to the bank won't change this candidate's interview.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {detail.interviews.map((i) => (
                  <li key={i.id} className="rounded-lg border border-line px-3.5 py-3">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={i.status} />
                      <span className="font-mono text-[10.5px] text-ink-400">{formatDateTime(i.created_at)}</span>
                    </div>
                    <p className="mt-1.5 font-mono text-[10.5px] tracking-wider text-ink-400">ID {i.id.slice(0, 8)}…</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-[11.5px] leading-relaxed text-ink-500">
              Recording capture and playback arrive in V1.2 — the storage and metadata foundation is already in place.
            </p>
          </Card>

          {/* Applications */}
          <Card className="p-5 animate-fade-up [animation-delay:140ms]">
            <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <ClipboardList className="h-4 w-4 text-primary-600" /> Applications ({detail.applications.length})
            </h2>
            {detail.applications.length === 0 ? (
              <p className="text-sm text-ink-400">No formal applications linked yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {detail.applications.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg border border-line px-3.5 py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-ink-900">{a.positions?.title ?? "Position"}</p>
                      <p className="font-mono text-[10.5px] text-ink-400">applied {formatDate(a.applied_at)}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Status history */}
          <Card className="p-5 animate-fade-up [animation-delay:200ms]">
            <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <History className="h-4 w-4 text-primary-600" /> Status history
            </h2>
            {detail.history.length === 0 ? (
              <p className="text-sm text-ink-400">No transitions recorded yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-line pl-4">
                {detail.history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute top-1 -left-[21.5px] h-2.5 w-2.5 rounded-full border-2 border-white bg-primary-500" />
                    <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                      {h.old_status && (
                        <>
                          <StatusBadge status={h.old_status} />
                          <span className="text-ink-400">→</span>
                        </>
                      )}
                      <StatusBadge status={h.new_status} />
                    </div>
                    <p className="mt-1 font-mono text-[10.5px] text-ink-400">
                      {formatDateTime(h.created_at)} {h.profiles?.full_name ? `· by ${h.profiles.full_name}` : ""}
                    </p>
                    {h.reason && <p className="mt-1 text-xs text-ink-500">{h.reason}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      {/* Status modal */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Change candidate status" subtitle="Recorded in status_history and the audit log — this is an atomic server-side operation.">
        <form onSubmit={statusForm.handleSubmit(onSubmitStatus)} className="space-y-4" noValidate>
          <Field label="New status" required error={statusForm.formState.errors.new_status?.message}>
            <SelectInput invalid={!!statusForm.formState.errors.new_status} defaultValue="" {...statusForm.register("new_status")}>
              <option value="" disabled>
                Select a stage…
              </option>
              {CANDIDATE_STATUSES.filter((s) => s !== c.status).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Reason" hint="optional" error={statusForm.formState.errors.reason?.message}>
            <TextArea rows={3} placeholder="e.g. Strong communication in phone screen" {...statusForm.register("reason")} />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setStatusModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Update status
            </Button>
          </div>
        </form>
      </Modal>

      {/* Interview modal */}
      <Modal open={interviewModal} onClose={() => setInterviewModal(false)} title="Create interview" subtitle="Questions are copied as snapshots into interview_questions — editing the bank later won't affect this candidate.">
        <div className="space-y-4">
          {sets.length === 0 ? (
            <p className="rounded-lg border border-warning-600/25 bg-warning-100/60 px-4 py-3 text-[13px] leading-relaxed text-warning-700">
              No active question sets yet. Build one under Question sets first.
            </p>
          ) : (
            <Field label="Question set" required>
              <SelectInput value={selectedSet} onChange={(e) => setSelectedSet(e.target.value)}>
                <option value="" disabled>
                  Choose a set…
                </option>
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.positions?.title ? ` — ${s.positions.title}` : ""}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setInterviewModal(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmitInterview} loading={busy} disabled={!selectedSet}>
              Create interview
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
