import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  AudioLines,
  Camera,
  CheckCircle2,
  Clapperboard,
  Lock,
  Mic,
  PlayCircle,
  RotateCcw,
  ShieldAlert,
  SkipForward,
  StopCircle,
  TimerReset,
  UploadCloud,
  Video,
} from "lucide-react";
import { useRecorder } from "../../hooks/useRecorder";
import { supportState, type RecorderKind } from "../../lib/recorder/media";
import { prepareRecording, finalizeRecording, failRecording } from "../../services/recordings";
import { uploadWithProgress } from "../../services/storage";
import { cn, formatBytes } from "../../lib/utils";
import type { InterviewQuestion, Recording } from "../../types";
import { Badge, Button, Card, StatusBadge } from "../ui/core";

const SUCCESSFUL = ["UPLOADED", "SUPERSEDED", "PROCESSING", "TRANSCRIBED"] as const;

type TickStatus = "PREPARING" | "RECORDING" | "REVIEWING" | "UPLOADING" | "FAILED" | "SKIPPED";

interface Props {
  question: InterviewQuestion;
  questionIndex: number;
  recordings: Recording[];
  onTick: (status: TickStatus) => Promise<void>;
  onUploaded: () => Promise<void> | void;
}

type UploadState =
  | { name: "idle" }
  | { name: "working"; pct: number }
  | { name: "error"; message: string };

export default function RecorderStudio({ question, questionIndex, recordings, onTick, onUploaded }: Props) {
  const support = useMemo(() => supportState(), []);
  const needsChoice = question.response_type_snapshot === "VIDEO_OR_AUDIO";
  const [mode, setMode] = useState<RecorderKind | null>(needsChoice ? null : (question.response_type_snapshot as RecorderKind));
  const [upload, setUpload] = useState<UploadState>({ name: "idle" });
  const [skipping, setSkipping] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const kind: RecorderKind = mode ?? "VIDEO";

  const rec = useRecorder({
    kind,
    maxDuration: question.maximum_duration_seconds,
    prepSeconds: question.preparation_time_seconds,
  });

  const attemptsUsed = recordings.filter((r) => (SUCCESSFUL as readonly string[]).includes(r.status)).length;
  const maxAttempts = question.maximum_retakes + 1;
  const attemptsLeft = maxAttempts - attemptsUsed;
  const currentTake = attemptsUsed + 1;
  const canRetakeAfterThis = currentTake < maxAttempts;

  /* Acquire devices whenever we're in the setup phase and devices are idle —
   * covers first mount, retakes (stream was released after the take) and
   * format switches. Never re-opens the camera during review/recording. */
  useEffect(() => {
    if (support !== "ok" || !mode || rec.phase !== "setup") return;
    if (rec.deviceStatus === "idle") void rec.initDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, support, rec.phase, rec.deviceStatus]);

  /* Attach the live stream to the preview <video> */
  useEffect(() => {
    const el = videoRef.current;
    if (el && rec.stream && kind === "VIDEO") {
      el.srcObject = rec.stream;
      el.muted = true;
      void el.play().catch(() => undefined);
    }
  }, [rec.stream, kind, rec.phase]);

  /* Persist lifecycle ticks (best-effort; COMPLETED only ever comes from the DB function) */
  const tick = useCallback(
    (s: TickStatus) => {
      onTick(s).catch(() => undefined);
    },
    [onTick]
  );

  useEffect(() => {
    if (rec.phase === "recording") tick("RECORDING");
    if (rec.phase === "review") tick("REVIEWING");
  }, [rec.phase, tick]);

  const begin = () => {
    tick("PREPARING");
    rec.startPreparation();
  };

  const submitAnswer = async () => {
    if (!rec.result) return;
    setUpload({ name: "working", pct: 0 });
    tick("UPLOADING");
    let preparedId: string | null = null;
    try {
      const prepared = await prepareRecording(
        question.id,
        rec.result.kind,
        rec.result.contentType,
        rec.result.durationSeconds
      );
      preparedId = prepared.id;
      await uploadWithProgress(
        "interview-recordings",
        prepared.storage_path,
        rec.result.blob,
        rec.result.contentType,
        (pct) => setUpload({ name: "working", pct })
      );
      await finalizeRecording(prepared.id, rec.result.blob.size);
      rec.release();
      await onUploaded();
    } catch (e) {
      if (preparedId) failRecording(preparedId).catch(() => undefined);
      tick("FAILED");
      const err = e as { message?: string };
      setUpload({
        name: "error",
        message: err?.message ?? "Upload failed. Your recording is still on this device — retry when ready.",
      });
    }
  };

  const skip = async () => {
    setSkipping(true);
    try {
      await onTick("SKIPPED");
      await onUploaded();
    } finally {
      setSkipping(false);
    }
  };

  /* ---------- Hard blockers ---------- */

  if (support !== "ok") {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-ink-900">
              {support === "insecure" ? "Secure connection required" : "Recording isn't supported here"}
            </h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500">
              {support === "insecure"
                ? "Browsers only expose the camera and microphone on HTTPS pages. Reopen this portal with https:// and reload."
                : "This browser doesn't support in-browser recording. Please use a recent version of Chrome, Edge or Safari and reload the page."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const deviceRows: { label: string; ok: boolean | null; needed: boolean }[] = [
    { label: "Camera", ok: rec.deviceStatus === "ready" ? kind === "VIDEO" : null, needed: kind === "VIDEO" },
    { label: "Microphone", ok: rec.deviceStatus === "ready" ? true : null, needed: true },
    { label: "Secure context (HTTPS)", ok: true, needed: true },
  ];

  const BARS = useMemo(() => Array.from({ length: 28 }, (_, i) => 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7))), []);

  return (
    <Card className="overflow-hidden animate-fade-up">
      {/* Question header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper/60 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 font-mono text-[12px] font-bold text-white">
          {String(questionIndex).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={question.status} />
            <Badge tone="neutral">
              take {Math.min(currentTake, maxAttempts)} of {maxAttempts}
            </Badge>
            {attemptsLeft > 0 && question.status !== "COMPLETED" && (
              <Badge tone={attemptsLeft === 1 ? "warning" : "info"}>
                {attemptsLeft === 1 ? "final attempt" : `${attemptsLeft} attempts left`}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="info">{question.response_type_snapshot.replace(/_/g, " ").toLowerCase()}</Badge>
          <Badge tone="warning">
            <TimerReset className="mr-1 inline h-3 w-3" />
            {question.preparation_time_seconds}s prep
          </Badge>
          <Badge tone="danger">max {Math.floor(question.maximum_duration_seconds / 60)}:{String(question.maximum_duration_seconds % 60).padStart(2, "0")}</Badge>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <h2 className="font-display text-lg leading-snug font-bold text-ink-900 sm:text-xl">
          {question.question_text_snapshot}
        </h2>

        {/* Format choice for VIDEO_OR_AUDIO */}
        {needsChoice && rec.phase === "setup" && (
          <div className="mt-4">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-400">Choose how to answer</p>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setMode("VIDEO")}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-4 transition-all duration-150",
                  mode === "VIDEO"
                    ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm"
                    : "border-line bg-white text-ink-500 hover:border-primary-300"
                )}
                aria-pressed={mode === "VIDEO"}
              >
                <Video className="h-5 w-5" />
                <span className="text-[13px] font-bold">Video answer</span>
                <span className="text-[11px]">Camera + microphone</span>
              </button>
              <button
                onClick={() => setMode("AUDIO")}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-4 transition-all duration-150",
                  mode === "AUDIO"
                    ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm"
                    : "border-line bg-white text-ink-500 hover:border-primary-300"
                )}
                aria-pressed={mode === "AUDIO"}
              >
                <AudioLines className="h-5 w-5" />
                <span className="text-[13px] font-bold">Audio answer</span>
                <span className="text-[11px]">Microphone only</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------- SETUP ---------------- */}
        {rec.phase === "setup" && mode && (
          <div className="mt-5 space-y-4">
            {/* Live preview */}
            <div className="relative overflow-hidden rounded-xl bg-navy-950">
              {kind === "VIDEO" ? (
                <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full -scale-x-100 object-cover" />
              ) : (
                <div className="flex aspect-[2/1] w-full items-end justify-center gap-1 px-8 pb-8">
                  {BARS.map((b, i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-full bg-primary-400 transition-[height] duration-100 ease-out"
                      style={{ height: `${Math.max(6, b * rec.level * 100)}%` }}
                    />
                  ))}
                </div>
              )}
              {rec.deviceStatus !== "ready" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy-950/80 px-6 text-center">
                  {rec.deviceError ? (
                    <>
                      <AlertTriangle className="h-6 w-6 text-amber-400" />
                      <p className="text-sm font-bold text-white">{rec.deviceError.title}</p>
                      <p className="max-w-sm text-[12.5px] leading-relaxed text-navy-200">{rec.deviceError.help}</p>
                    </>
                  ) : (
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-navy-300">
                      {rec.deviceStatus === "checking" ? "checking devices…" : "devices off"}
                    </p>
                  )}
                </div>
              )}
            </div>

            {rec.tooShort && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-warning-600/30 bg-warning-100/70 px-3.5 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
                <p className="text-[12.5px] font-medium text-warning-700">
                  That take was under 2 seconds, so it was discarded and no attempt was used. Try again when you're ready.
                </p>
              </div>
            )}

            {/* Device checklist */}
            <div className="grid gap-2 sm:grid-cols-3">
              {deviceRows.map((d) => (
                <div key={d.label} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2.5">
                  {d.label.startsWith("Camera") ? <Camera className="h-4 w-4 text-primary-600" /> : d.label.startsWith("Micro") ? <Mic className="h-4 w-4 text-primary-600" /> : <Lock className="h-4 w-4 text-primary-600" />}
                  <span className="flex-1 text-[12px] font-semibold text-ink-700">{d.label}</span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      d.ok === true ? "bg-success-600" : d.ok === false && d.needed ? "bg-ink-300" : "bg-ink-300/50"
                    )}
                  />
                  <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink-400">
                    {d.ok === true ? "ready" : d.needed ? "required" : "n/a"}
                  </span>
                </div>
              ))}
            </div>

            {/* Upload failure from a previous submit keeps the take local */}
            {upload.name === "error" && rec.result && (
              <div role="alert" className="rounded-lg border border-danger-600/25 bg-danger-100/60 px-3.5 py-3">
                <p className="text-[12.5px] font-semibold text-danger-700">{upload.message}</p>
                <Button variant="danger" size="sm" className="mt-2" onClick={() => void submitAnswer()} icon={<UploadCloud className="h-3.5 w-3.5" />}>
                  Retry upload
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              {rec.deviceStatus === "error" ? (
                <Button onClick={() => void rec.initDevices()} icon={<RotateCcw className="h-4 w-4" />}>
                  Try devices again
                </Button>
              ) : rec.deviceStatus === "ready" ? (
                <>
                  {rec.result && upload.name !== "error" ? (
                    <Button onClick={() => void submitAnswer()} icon={<UploadCloud className="h-4 w-4" />}>
                      Upload this take
                    </Button>
                  ) : (
                    <Button onClick={begin} disabled={attemptsLeft <= 0} icon={<Clapperboard className="h-4 w-4" />}>
                      Start — {question.preparation_time_seconds}s prep
                    </Button>
                  )}
                  {needsChoice && (
                    <Button variant="ghost" size="md" onClick={() => { setMode(null); rec.retake(); }}>
                      Change format
                    </Button>
                  )}
                </>
              ) : (
                <Button variant="outline" disabled icon={<Camera className="h-4 w-4" />}>
                  Preparing devices…
                </Button>
              )}
              {!question.is_required && (
                <Button variant="ghost" onClick={() => void skip()} loading={skipping} icon={<SkipForward className="h-4 w-4" />}>
                  Skip (optional)
                </Button>
              )}
              {attemptsLeft <= 0 && !rec.result && (
                <p className="w-full text-[12.5px] font-medium text-danger-600">
                  All attempts are used — this question keeps your last uploaded answer.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ---------------- PREPARING ---------------- */}
        {rec.phase === "preparing" && (
          <div className="mt-5">
            <div className="relative overflow-hidden rounded-xl bg-navy-950">
              {kind === "VIDEO" ? (
                <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full -scale-x-100 object-cover opacity-60" />
              ) : (
                <div className="aspect-[2/1] w-full" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-primary-300 animate-pulse-soft">
                  Get ready
                </p>
                <p className="font-display text-7xl font-bold text-white tabular-nums" aria-live="polite">
                  {Math.ceil(rec.prepRemaining)}
                </p>
                <p className="text-[12.5px] text-navy-200">Recording starts automatically at zero</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-900/8">
              <div
                className="h-full rounded-full bg-primary-600 transition-[width] duration-150 ease-linear"
                style={{ width: `${(rec.prepRemaining / Math.max(1, question.preparation_time_seconds)) * 100}%` }}
              />
            </div>
            <div className="mt-3 text-center">
              <Button variant="ghost" size="sm" onClick={rec.retake}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ---------------- RECORDING ---------------- */}
        {rec.phase === "recording" && (
          <div className="mt-5">
            <div className="relative overflow-hidden rounded-xl bg-navy-950 ring-2 ring-danger-600/70">
              {kind === "VIDEO" ? (
                <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full -scale-x-100 object-cover" />
              ) : (
                <div className="flex aspect-[2/1] w-full items-end justify-center gap-1 px-8 pb-8">
                  {BARS.map((b, i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-full bg-danger-600 transition-[height] duration-100 ease-out"
                      style={{ height: `${Math.max(6, b * rec.level * 100)}%` }}
                    />
                  ))}
                </div>
              )}
              <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-navy-950/80 px-3 py-1.5 backdrop-blur">
                <span className="h-2.5 w-2.5 rounded-full bg-danger-600 animate-pulse-soft" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white">Recording</span>
              </div>
              <div className="absolute top-3 right-3 rounded-full bg-navy-950/80 px-3 py-1.5 font-mono text-[13px] font-bold text-white tabular-nums backdrop-blur">
                {rec.elapsedClock} <span className="text-navy-300">/ {rec.maxClock}</span>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-900/8">
              <div
                className="h-full rounded-full bg-danger-600 transition-[width] duration-200 ease-linear"
                style={{ width: `${Math.min(100, (rec.elapsed / question.maximum_duration_seconds) * 100)}%` }}
              />
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={rec.stopRecording}
                className="flex h-16 min-w-44 items-center justify-center gap-2.5 rounded-full bg-danger-600 px-8 font-display text-[15px] font-bold text-white shadow-lift transition-all duration-150 hover:bg-danger-700 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-600"
                aria-label="Stop recording"
              >
                <StopCircle className="h-5 w-5" />
                Stop recording
              </button>
            </div>
            <p className="mt-2.5 text-center text-[11.5px] text-ink-400">
              The recorder stops automatically at {rec.maxClock} — you can never exceed the limit.
            </p>
          </div>
        )}

        {/* ---------------- REVIEW ---------------- */}
        {rec.phase === "review" && rec.result && (
          <div className="mt-5">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary-700">
              Review your answer
            </p>
            <div className="mt-2.5 overflow-hidden rounded-xl bg-navy-950">
              {rec.result.kind === "VIDEO" ? (
                <video src={rec.result.url} controls playsInline className="aspect-video w-full" />
              ) : (
                <div className="px-5 py-6">
                  <div className="mb-4 flex items-center justify-center gap-2 text-primary-300">
                    <PlayCircle className="h-5 w-5" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Audio answer</span>
                  </div>
                  <audio src={rec.result.url} controls className="w-full" />
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-500">
              <Badge tone="success">
                <CheckCircle2 className="mr-1 inline h-3 w-3" /> {rec.result.durationSeconds.toFixed(1)}s
              </Badge>
              <Badge tone="neutral">{formatBytes(rec.result.size)}</Badge>
              <Badge tone="neutral">{rec.result.mime.split(";")[0]}</Badge>
              {rec.autoStopped && <Badge tone="warning">stopped at time limit</Badge>}
            </div>

            {upload.name === "error" && (
              <div role="alert" className="mt-3 rounded-lg border border-danger-600/25 bg-danger-100/60 px-3.5 py-3">
                <p className="text-[12.5px] font-semibold text-danger-700">{upload.message}</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                onClick={rec.retake}
                disabled={!canRetakeAfterThis || upload.name === "working"}
                icon={<RotateCcw className="h-4 w-4" />}
              >
                Retake
              </Button>
              <Button onClick={() => void submitAnswer()} loading={upload.name === "working"} icon={<UploadCloud className="h-4 w-4" />}>
                {upload.name === "working" ? `Uploading… ${upload.pct}%` : "Submit answer"}
              </Button>
              {!canRetakeAfterThis && (
                <span className="text-[12px] font-medium text-warning-700">
                  Final attempt — this take will be your answer.
                </span>
              )}
            </div>
            {upload.name === "working" && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-900/8">
                <div
                  className="h-full rounded-full bg-primary-600 transition-[width] duration-200 ease-out"
                  style={{ width: `${upload.pct}%` }}
                />
              </div>
            )}
            {upload.name === "working" && upload.pct === 100 && (
              <p className="mt-2 font-mono text-[10.5px] uppercase tracking-wider text-ink-400">Finalizing…</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
