import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileWarning,
  FlagTriangleRight,
  Loader2,
  PartyPopper,
  RefreshCw,
  SendHorizonal,
  VideoOff,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  listCandidateInterviews,
  startInterview,
  submitInterview,
  setQuestionStatus,
  type CandidateInterview,
} from "../../services/interviews";
import { failRecording, listInterviewRecordings, type RecordingWithQuestion } from "../../services/recordings";
import { classifyError, cn, formatDateTime, type AppError } from "../../lib/utils";
import { Badge, Button, Card, Skeleton, StatusBadge } from "../../components/ui/core";
import { EmptyState, ErrorState, Modal, useToast } from "../../components/ui/feedback";
import RecorderStudio from "../../components/candidate/RecorderStudio";
import type { InterviewQuestion } from "../../types";

const ANSWERED = ["COMPLETED", "RECORDED", "SKIPPED"] as const;

export default function CandidateInterview() {
  const { candidate } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();

  const [interviews, setInterviews] = useState<CandidateInterview[] | null>(null);
  const [recordings, setRecordings] = useState<RecordingWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const load = useCallback(async () => {
    if (!candidate) return;
    setError(null);
    try {
      const list = await listCandidateInterviews(candidate.id);
      setInterviews(list);
      const active = list.find((i) => i.status === "NOT_STARTED" || i.status === "IN_PROGRESS");
      if (active) {
        const recs = await listInterviewRecordings(active.id);
        // Repair: uploads interrupted mid-flight can never be finalized (the
        // blob is gone) — mark them failed so the candidate can retry cleanly.
        // Failed rows do NOT consume an attempt (enforced in Postgres).
        const orphans = recs.filter((r) => r.status === "UPLOADING");
        for (const o of orphans) {
          failRecording(o.id).catch(() => undefined);
        }
        setRecordings(
          recs.map((r) => (r.status === "UPLOADING" ? { ...r, status: "FAILED" as const } : r))
        );
      } else {
        setRecordings([]);
      }
    } catch (e) {
      setError(classifyError(e));
    } finally {
      setLoading(false);
    }
  }, [candidate]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const active = useMemo(
    () => interviews?.find((i) => i.status === "NOT_STARTED" || i.status === "IN_PROGRESS") ?? null,
    [interviews]
  );
  const submitted = useMemo(() => interviews?.find((i) => i.status === "SUBMITTED") ?? null, [interviews]);

  const questions = active?.interview_questions ?? [];
  const answeredCount = questions.filter((q) => (ANSWERED as readonly string[]).includes(q.status)).length;
  const requiredDone = questions.filter((q) => q.is_required && q.status === "COMPLETED").length;
  const requiredTotal = questions.filter((q) => q.is_required).length;
  const canSubmit = active?.status === "IN_PROGRESS" && requiredDone === requiredTotal;

  const current: InterviewQuestion | null = useMemo(() => {
    const sorted = [...questions].sort((a, b) => a.display_order - b.display_order);
    return sorted.find((q) => !(ANSWERED as readonly string[]).includes(q.status)) ?? null;
  }, [questions]);

  const recsFor = (qid: string) => recordings.filter((r) => r.interview_question_id === qid);

  const onStart = async () => {
    if (!active) return;
    setStarting(true);
    try {
      await startInterview(active.id);
      await load();
      push("success", "Interview started — good luck. Your progress saves after every answer.");
    } catch (e) {
      push("error", classifyError(e).message);
    } finally {
      setStarting(false);
    }
  };

  const onSubmit = async () => {
    if (!active) return;
    setSubmitting(true);
    try {
      await submitInterview(active.id);
      push("success", "Interview submitted — the recruitment team has been notified.");
      navigate("/candidate/complete");
    } catch (e) {
      push("error", classifyError(e).message);
      setConfirmSubmit(false);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Guards ---------------- */

  if (!candidate) {
    return (
      <EmptyState
        icon={<VideoOff className="h-5.5 w-5.5" />}
        title="Complete registration first"
        body="Your interview lives under your candidate profile. Finish step 1 and the recruitment team can assign questions."
        action={
          <Link to="/candidate/register">
            <Button>Complete registration</Button>
          </Link>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState error={error} onRetry={load} />
      </div>
    );
  }

  if (!interviews || interviews.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-5.5 w-5.5" />}
        title="No interview assigned yet"
        body="A recruiter assigns your question set from the HR console. The moment it exists, every question appears here with its prep time, duration and retake limits."
      />
    );
  }

  /* ---------------- Terminal states ---------------- */

  if (!active && submitted) {
    return (
      <div className="mx-auto max-w-xl animate-fade-up">
        <Card className="p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-600 text-white shadow-lift">
            <PartyPopper className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink-900">Interview submitted</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            Submitted {formatDateTime(submitted.submitted_at)}. Your answers are stored privately and visible only to
            the reviewers assigned to your application.
          </p>
          <Link to="/candidate/complete" className="mt-5 inline-block">
            <Button variant="outline">View confirmation</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (active && (active.status === "EXPIRED" || active.status === "CANCELLED")) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorState
          compact
          error={{
            kind: "validation",
            message: `This interview is ${active.status.toLowerCase()} and can no longer be taken. Please contact the recruitment team, quoting ${candidate.reference_code}.`,
          }}
        />
      </div>
    );
  }

  if (!active) return null;

  /* ---------------- Gates: CV + start ---------------- */

  if (active.status === "NOT_STARTED") {
    const cvMissing = !candidate.cv_path;
    return (
      <div className="mx-auto max-w-xl space-y-4 animate-fade-up">
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-navy-900 px-6 py-6 navy-texture">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-300">Your interview is ready</p>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
              {questions.length} question{questions.length === 1 ? "" : "s"} · recorded at your own pace
            </h1>
          </div>
          <div className="space-y-4 px-6 py-6">
            <ol className="space-y-2.5">
              {[
                { label: "CV uploaded", done: !cvMissing },
                { label: "Camera / microphone checked", done: false },
                { label: `${questions.length} questions answered`, done: false },
                { label: "Interview submitted", done: false },
              ].map((s, i) => (
                <li key={s.label} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] font-bold",
                      s.done ? "bg-success-600 text-white" : "bg-ink-900/8 text-ink-500"
                    )}
                  >
                    {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={cn("text-[13.5px] font-semibold", s.done ? "text-success-700" : "text-ink-700")}>{s.label}</span>
                </li>
              ))}
            </ol>
            {cvMissing && (
              <div className="flex items-start gap-2.5 rounded-lg border border-warning-600/30 bg-warning-100/70 px-3.5 py-3">
                <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
                <p className="text-[12.5px] leading-relaxed font-medium text-warning-700">
                  Your CV is required before the interview can start — the check is enforced on the server, not just here.
                  <Link to="/candidate" className="ml-1 font-bold underline underline-offset-2">Upload it now</Link>
                </p>
              </div>
            )}
            <Button className="w-full" onClick={() => void onStart()} loading={starting} disabled={cvMissing} icon={<FlagTriangleRight className="h-4 w-4" />}>
              {cvMissing ? "Upload your CV to begin" : "Start interview"}
            </Button>
            <p className="text-center text-[11.5px] leading-relaxed text-ink-400">
              You can stop at any time — every uploaded answer is saved and waiting when you return.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  /* ---------------- Active runner ---------------- */

  const qIndex = current ? questions.find((q) => q.id === current.id)!.display_order : questions.length;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Session header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 animate-fade-up">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-700">
            {current ? `Question ${qIndex} of ${questions.length}` : "All questions answered"}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <StatusBadge status={active.status} />
            <Badge tone="success">{requiredDone}/{requiredTotal} required done</Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => load()} icon={<RefreshCw className="h-3.5 w-3.5" />}>
          Refresh
        </Button>
      </div>

      {/* Progress rail */}
      <div className="mb-5 animate-fade-up [animation-delay:60ms]">
        <div className="flex gap-1" role="list" aria-label="Question progress">
          {[...questions]
            .sort((a, b) => a.display_order - b.display_order)
            .map((q) => {
              const isCurrent = current?.id === q.id;
              const answered = (ANSWERED as readonly string[]).includes(q.status);
              const failed = q.status === "FAILED";
              return (
                <div
                  key={q.id}
                  role="listitem"
                  title={`Question ${q.display_order}: ${q.status.toLowerCase().replace(/_/g, " ")}`}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-all duration-300",
                    answered ? "bg-success-600" : failed ? "bg-danger-600" : isCurrent ? "bg-primary-500 animate-pulse-soft" : "bg-ink-900/10"
                  )}
                />
              );
            })}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 font-mono text-[9.5px] uppercase tracking-wider text-ink-400">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success-600" /> answered</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary-500" /> current</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-danger-600" /> needs retry</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-ink-900/15" /> upcoming</span>
        </div>
      </div>

      {/* Studio for the current question */}
      {current ? (
        <RecorderStudio
          key={current.id}
          question={current}
          questionIndex={current.display_order}
          recordings={recsFor(current.id)}
          onTick={(s) => setQuestionStatus(current.id, s)}
          onUploaded={load}
        />
      ) : (
        <Card className="p-8 text-center animate-fade-up">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-100 text-success-600">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-bold text-ink-900">Every required answer is in.</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">
            Review the summary below, then submit. After submission the interview locks and moves to the recruitment
            team for review.
          </p>
        </Card>
      )}

      {/* Submit bar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-5 py-4 animate-fade-up [animation-delay:120ms]">
        <p className="text-[12.5px] leading-relaxed text-ink-500">
          {canSubmit ? (
            <span className="font-semibold text-success-700">All {requiredTotal} required answers uploaded. Ready to submit.</span>
          ) : (
            <>
              {requiredTotal - requiredDone > 0
                ? `${requiredTotal - requiredDone} required answer${requiredTotal - requiredDone === 1 ? "" : "s"} still needed before submission.`
                : "Finish the current question to unlock submission."}
            </>
          )}
        </p>
        <Button
          onClick={() => setConfirmSubmit(true)}
          disabled={!canSubmit}
          icon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        >
          Submit interview
        </Button>
      </div>

      <Modal
        open={confirmSubmit}
        onClose={() => !submitting && setConfirmSubmit(false)}
        title="Submit your interview?"
        subtitle="This is final — questions lock and your answers go to the review team."
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-paper/60 px-4 py-3">
            <p className="text-[13px] font-semibold text-ink-900">
              {answeredCount} of {questions.length} questions answered · {requiredDone}/{requiredTotal} required
            </p>
            <p className="mt-1 text-[12px] text-ink-500">
              Skipped optional questions stay skipped. Uploaded recordings can't be re-recorded after submission.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmSubmit(false)} disabled={submitting}>
              Keep working
            </Button>
            <Button onClick={() => void onSubmit()} loading={submitting} icon={<ArrowRight className="h-4 w-4" />}>
              Yes, submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
