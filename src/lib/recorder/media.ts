/**
 * Browser media capabilities: MIME negotiation, permission handling and
 * human-readable error mapping. No third-party recording services.
 */

export type RecorderKind = "VIDEO" | "AUDIO";

export type DeviceErrorCode =
  | "unsupported"
  | "insecure"
  | "denied"
  | "missing"
  | "in_use"
  | "failed";

export interface DeviceError {
  code: DeviceErrorCode;
  title: string;
  help: string;
}

/* ---------------- Capability detection ---------------- */

export function isSecure(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === true;
}

export function canRecord(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

export type SupportState = "ok" | "unsupported" | "insecure";

export function supportState(): SupportState {
  if (!isSecure()) return "insecure";
  if (!canRecord()) return "unsupported";
  return "ok";
}

/* ---------------- MIME strategy ----------------
 * Never hardcode one format: probe MediaRecorder.isTypeSupported in order of
 * preference. webm/opus covers Chrome/Edge/Firefox/Android; mp4 covers
 * iPhone & desktop Safari.
 */

const VIDEO_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
];

const AUDIO_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

export function pickMimeType(kind: RecorderKind): string | null {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return null;
  const list = kind === "VIDEO" ? VIDEO_CANDIDATES : AUDIO_CANDIDATES;
  for (const mime of list) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      /* keep probing */
    }
  }
  return null; // let the browser pick its default
}

export function baseMime(mime: string | null): string {
  if (!mime) return "video/webm";
  return mime.split(";")[0].toLowerCase();
}

export function extForMime(mime: string): "webm" | "mp4" {
  return baseMime(mime).includes("mp4") ? "mp4" : "webm";
}

/** Base MIME that matches the bucket's allowed_mime_types whitelist. */
export function uploadContentType(kind: RecorderKind, mime: string | null): string {
  const base = baseMime(mime);
  if (base === "video/mp4" || base === "audio/mp4" || base === "video/webm" || base === "audio/webm") {
    return base;
  }
  return kind === "VIDEO" ? "video/webm" : "audio/webm";
}

/* ---------------- Constraints ---------------- */

export function constraintsFor(kind: RecorderKind): MediaStreamConstraints {
  return kind === "VIDEO"
    ? {
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      }
    : { audio: { echoCancellation: true, noiseSuppression: true } };
}

/* ---------------- Error mapping ----------------
 * Raw browser errors are never shown to candidates.
 */

export function mapMediaError(err: unknown, kind: RecorderKind): DeviceError {
  const e = err as { name?: string; message?: string };
  const name = e?.name ?? "";

  if (!isSecure()) {
    return {
      code: "insecure",
      title: "Secure connection required",
      help: "Your browser only allows camera and microphone access on HTTPS pages. Reopen this page with https:// and try again.",
    };
  }
  if (!canRecord()) {
    return {
      code: "unsupported",
      title: "This browser can't record",
      help: "Please use a recent version of Chrome, Edge or Safari on a phone, tablet or computer, then reload this page.",
    };
  }
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
    return {
      code: "denied",
      title: kind === "VIDEO" ? "Camera or microphone blocked" : "Microphone blocked",
      help:
        "Permission was denied. Click the lock icon in your browser's address bar, allow " +
        (kind === "VIDEO" ? "camera and microphone" : "the microphone") +
        " for this site, then try again.",
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return {
      code: "missing",
      title: kind === "VIDEO" ? "No camera found" : "No microphone found",
      help:
        kind === "VIDEO"
          ? "We couldn't detect a camera. Connect one (or close other apps using it) and try again."
          : "We couldn't detect a microphone. Connect one (or close other apps using it) and try again.",
    };
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    return {
      code: "in_use",
      title: "Device is busy",
      help: "Another app seems to be using your camera or microphone right now. Close it (video calls, other tabs) and try again.",
    };
  }
  return {
    code: "failed",
    title: "Couldn't start the device",
    help: "Something unexpected went wrong while starting your devices. Refresh the page and try once more.",
  };
}

/* ---------------- Stream cleanup ---------------- */

export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* already stopped */
    }
  });
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
