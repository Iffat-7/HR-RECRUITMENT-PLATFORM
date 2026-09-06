import { useCallback, useEffect, useRef, useState } from "react";
import {
  constraintsFor,
  formatClock,
  mapMediaError,
  pickMimeType,
  stopStream,
  uploadContentType,
  type DeviceError,
  type RecorderKind,
} from "../lib/recorder/media";

/**
 * Pure browser recording engine (MediaRecorder API).
 *
 * Lifecycle:  setup → preparing (countdown) → recording → review
 * The hook never uploads — it hands back a Blob; persistence is the caller's
 * job (two-phase prepare/finalize against Postgres + private storage).
 *
 * All streams, timers, object URLs and AudioContexts are released on unmount
 * so the camera/mic LED cannot stay on after leaving the page.
 */

export type RecorderPhase = "setup" | "preparing" | "recording" | "review";

export type DeviceStatus = "idle" | "checking" | "ready" | "error";

export interface RecordingResult {
  blob: Blob;
  url: string;
  /** base MIME used for the upload Content-Type (bucket whitelist safe) */
  contentType: string;
  /** full MIME incl. codecs, as reported by MediaRecorder */
  mime: string;
  durationSeconds: number;
  size: number;
  kind: RecorderKind;
}

interface UseRecorderArgs {
  kind: RecorderKind;
  maxDuration: number;
  prepSeconds: number;
  minSeconds?: number;
}

export function useRecorder({ kind, maxDuration, prepSeconds, minSeconds = 2 }: UseRecorderArgs) {
  const [phase, setPhase] = useState<RecorderPhase>("setup");
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("idle");
  const [deviceError, setDeviceError] = useState<DeviceError | null>(null);
  const [prepRemaining, setPrepRemaining] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [autoStopped, setAutoStopped] = useState(false);
  const [tooShort, setTooShort] = useState(false);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [level, setLevel] = useState(0); // 0..1 mic RMS (audio visualizer)

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const prepTimerRef = useRef<number | null>(null);
  const recTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startTsRef = useRef(0);
  const stopTsRef = useRef(0);
  const mimeRef = useRef<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const phaseRef = useRef<RecorderPhase>("setup");
  phaseRef.current = phase;

  const clearTimers = useCallback(() => {
    if (prepTimerRef.current) window.clearInterval(prepTimerRef.current);
    if (recTimerRef.current) window.clearInterval(recTimerRef.current);
    prepTimerRef.current = null;
    recTimerRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const teardownStream = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => undefined);
    }
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  const discardResult = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setResult(null);
    setElapsed(0);
    setAutoStopped(false);
    setTooShort(false);
  }, []);

  /* ---------------- Device acquisition ---------------- */

  const initDevices = useCallback(async (): Promise<boolean> => {
    setDeviceStatus("checking");
    setDeviceError(null);
    teardownStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraintsFor(kind));
      streamRef.current = stream;

      // Mic level meter (works for both kinds; harmless on video)
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        audioCtxRef.current = ctx;
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          if (!audioCtxRef.current) return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          setLevel(Math.min(1, Math.sqrt(sum / data.length) * 2.2));
          rafRef.current = requestAnimationFrame(tick);
        };
        // AudioContext may start suspended until a user gesture
        if (ctx.state === "suspended") void ctx.resume().then(tick).catch(() => undefined);
        else tick();
      } catch {
        /* meter is best-effort */
      }

      setDeviceStatus("ready");
      return true;
    } catch (e) {
      setDeviceError(mapMediaError(e, kind));
      setDeviceStatus("error");
      return false;
    }
  }, [kind, teardownStream]);

  /* ---------------- Preparation countdown ---------------- */

  const startPreparation = useCallback(() => {
    setTooShort(false);
    setAutoStopped(false);
    if (prepSeconds <= 0) {
      beginRecording();
      return;
    }
    setPhase("preparing");
    const endAt = Date.now() + prepSeconds * 1000;
    setPrepRemaining(prepSeconds);
    prepTimerRef.current = window.setInterval(() => {
      const remaining = Math.max(0, (endAt - Date.now()) / 1000);
      setPrepRemaining(remaining);
      if (remaining <= 0) {
        if (prepTimerRef.current) window.clearInterval(prepTimerRef.current);
        prepTimerRef.current = null;
        beginRecording();
      }
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepSeconds]);

  /* ---------------- Recording ---------------- */

  const finishRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      stopTsRef.current = Date.now();
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    clearTimers();
  }, [clearTimers]);

  const beginRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") return;
    const mime = pickMimeType(kind);
    mimeRef.current = mime;
    chunksRef.current = [];

    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(
        stream,
        mime
          ? {
              mimeType: mime,
              videoBitsPerSecond: 900_000,
              audioBitsPerSecond: 128_000,
            }
          : undefined
      );
    } catch {
      rec = new MediaRecorder(stream);
    }
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onerror = () => {
      clearTimers();
      setDeviceError({
        code: "failed",
        title: "Recording failed",
        help: "The browser interrupted the recording unexpectedly. Nothing was uploaded — you can try again.",
      });
      setPhase("setup");
    };
    rec.onstop = () => {
      const duration = Math.min(maxDuration, (stopTsRef.current - startTsRef.current) / 1000);
      const blob = new Blob(chunksRef.current, {
        type: uploadContentType(kind, rec.mimeType || mimeRef.current),
      });
      chunksRef.current = [];
      if (duration < minSeconds || blob.size === 0) {
        setTooShort(true);
        setPhase("setup");
        return;
      }
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setResult({
        blob,
        url,
        contentType: uploadContentType(kind, rec.mimeType || mimeRef.current),
        mime: rec.mimeType || mimeRef.current || uploadContentType(kind, null),
        durationSeconds: Math.round(duration * 10) / 10,
        size: blob.size,
        kind,
      });
      setPhase("review");
      // Release the live device once the take is captured (perf + privacy)
      teardownStream();
      setDeviceStatus("idle");
    };

    setElapsed(0);
    setPhase("recording");
    startTsRef.current = Date.now();
    stopTsRef.current = startTsRef.current;
    rec.start(250);

    const endAt = startTsRef.current + maxDuration * 1000;
    recTimerRef.current = window.setInterval(() => {
      const now = Date.now();
      setElapsed((now - startTsRef.current) / 1000);
      if (now >= endAt) {
        setAutoStopped(true);
        finishRecording();
      }
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, maxDuration, minSeconds, clearTimers, teardownStream]);

  /* ---------------- Retake / reset ---------------- */

  const retake = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
    recorderRef.current = null;
    clearTimers();
    discardResult();
    setPhase("setup");
  }, [clearTimers, discardResult]);

  /** Called by the runner right before upload completes or the page unmounts. */
  const release = useCallback(() => {
    clearTimers();
    discardResult();
    teardownStream();
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
    recorderRef.current = null;
  }, [clearTimers, discardResult, teardownStream]);

  /* Release everything on unmount — camera LED must go off. */
  useEffect(() => {
    return () => {
      clearTimers();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      teardownStream();
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch {
          /* noop */
        }
      }
    };
  }, [clearTimers, teardownStream]);

  return {
    phase,
    deviceStatus,
    deviceError,
    prepRemaining,
    prepClock: formatClock(Math.ceil(prepRemaining)),
    elapsed,
    elapsedClock: formatClock(Math.floor(elapsed)),
    maxClock: formatClock(maxDuration),
    autoStopped,
    tooShort,
    level,
    result,
    stream: streamRef.current,
    initDevices,
    startPreparation,
    stopRecording: finishRecording,
    retake,
    release,
  };
}

export type RecorderApi = ReturnType<typeof useRecorder>;
