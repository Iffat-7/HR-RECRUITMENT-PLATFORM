import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Film, Mic, Video, VideoOff } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { listCandidateInterviews, type CandidateInterview } from "../../services/interviews";
import { classifyError, formatDuration, formatDateTime, type AppError } from "../../lib/utils";
import { Badge, Button, Card, Skeleton, StatusBadge } from "../../components/ui/core";
import { EmptyState, ErrorState } from "../../components/ui/feedback";

const FUTURE_STEPS = ["Prep timer", "Record", "Preview", "Retake?", "Secure upload"];

export default function CandidateInterview() {
  const { candidate } = useAuth();
  const [interviews, setInterviews] = useState<CandidateInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const load = useCallback(async () => {
    if (!candidate) return;
    setLoading(true);
    setError(null);
    try {
      setInterviews(await listCandidateInterviews(candidate.id));
    } catch (e) {
      setError(classifyError(e));
    } finally {
      setLoading(false);
    }
  }, [candidate]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="animate-fade-up">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-700">Step 3 — Interview</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900">Your interview</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Questions assigned to you, exactly as the recruitment team froze them — later edits to their question bank
          won't change what you see here.
        </p>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorState error={error} onRetry={load} />
        </div>
      )}

      {loading && !error && (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !error && interviews.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={<CalendarClock className="h-5.5 w-5.5" />}
            title="No interview assigned yet"
            body="A recruiter assigns your question set from the HR console. You'll see every question — with prep time, duration and retake limits — the moment it's created. Check back soon."
          />
        </div>
      )}

      {!loading &&
        !error &&
        interviews.map((iv) => (
          <div key={iv.id} className="mt-6 space-y-4">
            <Card className="flex flex-wrap items-center justify-between gap-3 p-5 animate-fade-up">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-400">Interview session</p>
                <p className="mt-0.5 text-sm text-ink-500">
                  Assigned {formatDateTime(iv.created_at)} · {iv.interview_questions.length} question
                  {iv.interview_questions.length === 1 ? "" : "s"}
                </p>
              </div>
              <StatusBadge status={iv.status} />
            </Card>

            <ol className="space-y-3">
              {iv.interview_questions.map((q, i) => (
                <li key={q.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <Card className="p-5 transition-all hover:border-primary-300">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-900 font-mono text-[12px] font-bold text-white">
                        {String(q.display_order).padStart(2, "0")}
                      </span>
                      <StatusBadge status={q.status} />
                    </div>
                    <p className="mt-3 text-[15px] leading-snug font-semibold text-ink-900">{q.question_text_snapshot}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge tone="info">
                        {q.response_type_snapshot === "VIDEO" ? <Video className="mr-1 inline h-3 w-3" /> : q.response_type_snapshot === "AUDIO" ? <Mic className="mr-1 inline h-3 w-3" /> : <Film className="mr-1 inline h-3 w-3" />}
                        {q.response_type_snapshot.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                      <Badge tone="neutral">max {formatDuration(q.maximum_duration_seconds)}</Badge>
                      <Badge tone="warning">{formatDuration(q.preparation_time_seconds)} prep</Badge>
                      <Badge tone="neutral">{q.maximum_retakes} retake{q.maximum_retakes === 1 ? "" : "s"}</Badge>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>

            {/* Honest V1.2 panel */}
            <Card className="overflow-hidden animate-fade-up">
              <div className="border-b border-dashed border-line-strong bg-paper/70 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Badge tone="warning" dot>recorder — V1.2</Badge>
                  <h2 className="font-display text-[14.5px] font-bold text-ink-900">What happens here next milestone</h2>
                </div>
              </div>
              <div className="px-6 py-5">
                <ol className="flex flex-wrap items-center gap-2">
                  {FUTURE_STEPS.map((s, i) => (
                    <li key={s} className="flex items-center gap-2">
                      <span className="rounded-lg border border-line bg-white px-3 py-1.5 font-mono text-[11px] font-semibold text-ink-500">
                        {s}
                      </span>
                      {i < FUTURE_STEPS.length - 1 && <span className="h-px w-4 bg-line-strong" />}
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-[13px] leading-relaxed text-ink-500">
                  The recording pipeline — browser capture, preview, retakes and resumable uploads to private storage —
                  is intentionally not built in V1.1. The database already stores everything it needs: per-question
                  limits, attempt numbers, upload status and file metadata.
                </p>
              </div>
            </Card>
          </div>
        ))}
    </div>
  );
}
