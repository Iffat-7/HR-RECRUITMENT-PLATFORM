import { useCallback, useEffect, useState } from "react";
import { AudioLines, Clapperboard, Play, ShieldCheck } from "lucide-react";
import { listInterviewRecordings, getPlaybackUrl, type RecordingWithQuestion } from "../../services/recordings";
import { classifyError, formatBytes, formatDateTime, formatDuration, type AppError } from "../../lib/utils";
import { Badge, Button, Card, Skeleton, StatusBadge } from "../ui/core";
import { ErrorState, Modal } from "../ui/feedback";
import type { Interview } from "../../types";

/**
 * HR playback — recordings are listed as metadata only; the media itself is
 * fetched on demand through short-lived (120s) signed URLs. Storage RLS
 * restricts this to HR roles; candidates never receive these links.
 */

interface PlayingState {
  rec: RecordingWithQuestion;
  url: string;
}

export default function RecordingsPanel({ interviews }: { interviews: Interview[] }) {
  const [rows, setRows] = useState<RecordingWithQuestion[] | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [playing, setPlaying] = useState<PlayingState | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const all = await Promise.all(interviews.map((i) => listInterviewRecordings(i.id)));
      setRows(
        all
          .flat()
          .sort(
            (a, b) =>
              (a.interview_questions?.display_order ?? 0) - (b.interview_questions?.display_order ?? 0) ||
              a.attempt_number - b.attempt_number
          )
      );
    } catch (e) {
      setError(classifyError(e));
    }
  }, [interviews]);

  useEffect(() => {
    if (interviews.length > 0) void load();
    else setRows([]);
  }, [interviews, load]);

  const play = async (rec: RecordingWithQuestion) => {
    setLoadingId(rec.id);
    setPlayError(null);
    try {
      const url = await getPlaybackUrl(rec);
      setPlaying({ rec, url });
    } catch (e) {
      setPlayError(classifyError(e).message);
    } finally {
      setLoadingId(null);
    }
  };

  const byQuestion = (rows ?? []).reduce<Record<string, RecordingWithQuestion[]>>((acc, r) => {
    const key = r.interview_question_id;
    (acc[key] = acc[key] ?? []).push(r);
    return acc;
  }, {});

  return (
    <Card className="p-5 animate-fade-up [animation-delay:110ms]">
      <h2 className="mb-1 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
        <Clapperboard className="h-4 w-4 text-primary-600" /> Recorded answers
      </h2>
      <p className="mb-4 flex items-center gap-1.5 text-[11.5px] text-ink-400">
        <ShieldCheck className="h-3.5 w-3.5 text-success-600" />
        Playback uses 2-minute signed URLs — no public links, access is logged.
      </p>

      {error && <ErrorState error={error} onRetry={load} compact />}

      {!rows && !error && (
        <div className="space-y-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      )}

      {rows && rows.length === 0 && !error && (
        <p className="rounded-lg border border-dashed border-line-strong bg-paper/50 px-4 py-6 text-center text-[13px] text-ink-400">
          No recordings uploaded yet. Answers appear here the moment a candidate submits them.
        </p>
      )}

      {playError && (
        <div role="alert" className="mb-3 rounded-lg border border-danger-600/25 bg-danger-100/60 px-3.5 py-2.5 text-[12.5px] font-medium text-danger-700">
          {playError}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="space-y-3">
          {Object.entries(byQuestion).map(([qid, recs]) => {
            const latest = [...recs].sort((a, b) => b.attempt_number - a.attempt_number)[0];
            const q = latest.interview_questions;
            return (
              <div key={qid} className="rounded-lg border border-line">
                <div className="flex items-start justify-between gap-3 border-b border-line/70 bg-paper/50 px-4 py-2.5">
                  <p className="line-clamp-2 text-[13px] leading-snug font-semibold text-ink-900">
                    <span className="mr-1.5 font-mono text-[10.5px] text-ink-400">Q{String(q?.display_order ?? "?").padStart(2, "0")}</span>
                    {q?.question_text_snapshot ?? "Question"}
                  </p>
                  <Badge tone="neutral" className="shrink-0">
                    {recs.filter((r) => r.status === "UPLOADED" || r.status === "SUPERSEDED").length} take
                    {recs.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <ul>
                  {recs.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2.5 px-4 py-2.5 last:border-t last:border-line/60">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                        {r.file_type === "VIDEO" ? <Clapperboard className="h-3.5 w-3.5" /> : <AudioLines className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] font-semibold text-ink-700">
                          Attempt {r.attempt_number} · {formatDuration(Number(r.duration_seconds ?? 0))} · {formatBytes(r.file_size)}
                        </p>
                        <p className="font-mono text-[10px] text-ink-400">
                          {r.mime_type ?? r.file_type.toLowerCase()} · {r.uploaded_at ? formatDateTime(r.uploaded_at) : "—"}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                      {(r.status === "UPLOADED" || r.status === "PROCESSING" || r.status === "TRANSCRIBED") && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => void play(r)}
                          loading={loadingId === r.id}
                          icon={<Play className="h-3 w-3" />}
                        >
                          Play
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!playing}
        onClose={() => setPlaying(null)}
        title={playing ? `Attempt ${playing.rec.attempt_number} — ${playing.rec.file_type.toLowerCase()} answer` : ""}
        subtitle="Signed URL expires in 2 minutes. Access to this playback is logged."
        wide
      >
        {playing &&
          (playing.rec.file_type === "VIDEO" ? (
            <video src={playing.url} controls playsInline className="aspect-video w-full rounded-xl bg-navy-950" />
          ) : (
            <div className="rounded-xl bg-paper p-6">
              <audio src={playing.url} controls className="w-full" />
            </div>
          ))}
        {playing && (
          <p className="mt-3 font-mono text-[10.5px] uppercase tracking-wider text-ink-400">
            {formatDuration(Number(playing.rec.duration_seconds ?? 0))} · {formatBytes(playing.rec.file_size)} ·{" "}
            {playing.rec.mime_type ?? "—"}
          </p>
        )}
      </Modal>
    </Card>
  );
}
