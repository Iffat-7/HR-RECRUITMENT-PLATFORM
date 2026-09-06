import { supabase, supabaseAnonKey, supabaseUrl } from "../lib/supabase/client";
import type { AppError } from "../lib/utils";

/**
 * Uploads + signed URLs against PRIVATE Supabase Storage buckets.
 * Public URLs are never created anywhere in this codebase.
 */

/* ---------------- File validation rules (shared client config) ---------------- */

export interface FileRules {
  label: string;
  accept: string[]; // extensions incl. dot
  mimes: string[];
  maxBytes: number;
  maxBytesLabel: string;
}

export const CV_RULES: FileRules = {
  label: "CV / resume",
  accept: [".pdf", ".doc", ".docx"],
  mimes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  maxBytes: 10 * 1024 * 1024,
  maxBytesLabel: "10 MB",
};

export const PHOTO_RULES: FileRules = {
  label: "Profile photo",
  accept: [".jpg", ".jpeg", ".png", ".webp"],
  mimes: ["image/jpeg", "image/png", "image/webp"],
  maxBytes: 5 * 1024 * 1024,
  maxBytesLabel: "5 MB",
};

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

export function validateFile(file: File, rules: FileRules): string | null {
  const ext = extOf(file.name);
  if (!rules.accept.includes(ext)) {
    return `Unsupported file type "${ext || file.name}". Accepted: ${rules.accept.join(", ")}.`;
  }
  // Some browsers report an empty MIME — fall back to the extension check above.
  if (file.type && !rules.mimes.includes(file.type)) {
    return `The file's content type (${file.type}) doesn't match an accepted ${rules.label.toLowerCase()} format.`;
  }
  if (file.size === 0) return "The file is empty.";
  if (file.size > rules.maxBytes) {
    return `File is too large (${formatMb(file.size)}). Maximum is ${rules.maxBytesLabel}.`;
  }
  return null;
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ---------------- Path helpers (server policy: folder 1 = candidate_id) ---------------- */

function uuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

export const cvPath = (candidateId: string, ext: string) => `${candidateId}/cv/${uuid()}${ext}`;
export const photoPath = (candidateId: string, ext: string) =>
  `${candidateId}/profile/${uuid()}${ext}`;

/* ---------------- Upload with progress ----------------
 * supabase-js uses fetch (no progress events), so uploads go through XHR
 * against the same authenticated storage endpoint.
 */

export async function uploadWithProgress(
  bucket: string,
  path: string,
  data: Blob,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw {
      kind: "unauthorized",
      message: "Your session has expired. Please sign in again — your recording is still on this device.",
    } satisfies AppError;
  }

  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
  // Re-wrap with the whitelisted content type so bucket MIME policies pass.
  const body = new Blob([data], { type: contentType });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", supabaseAnonKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.timeout = 5 * 60 * 1000; // long recordings on slow mobile networks

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(parseStorageError(xhr.status, xhr.responseText));
    };
    xhr.ontimeout = () =>
      reject({
        kind: "network",
        message: "The upload timed out. Your recording is safe on this device — use Retry when you're back on a stronger connection.",
      } satisfies AppError);
    xhr.onerror = () =>
      reject({
        kind: "network",
        message: "Network error during upload. Nothing was lost — use Retry once your connection returns.",
      } satisfies AppError);
    xhr.onabort = () =>
      reject({ kind: "network", message: "Upload cancelled." } satisfies AppError);

    xhr.send(body);
  });
}

function parseStorageError(status: number, body: string): AppError {
  let detail = "";
  try {
    detail = (JSON.parse(body)?.message ?? "").toLowerCase();
  } catch {
    /* opaque body */
  }
  if (status === 401 || detail.includes("jwt")) {
    return { kind: "unauthorized", message: "Your session has expired. Please sign in again." };
  }
  if (status === 403 || detail.includes("row-level security") || detail.includes("policy")) {
    return {
      kind: "unauthorized",
      message: "Upload rejected by storage security policy — files can only be written to your own candidate folder.",
    };
  }
  if (status === 413 || detail.includes("size")) {
    return { kind: "validation", message: "The file exceeds the bucket size limit." };
  }
  if (status === 415 || detail.includes("mime") || detail.includes("type")) {
    return { kind: "validation", message: "The file format isn't accepted for this bucket." };
  }
  if (status === 409) {
    return { kind: "conflict", message: "A file with that name already exists — retry to generate a new one." };
  }
  if (status === 0) {
    return { kind: "network", message: "Network error during upload. Your recording is safe — use Retry." };
  }
  return { kind: "generic", message: "Upload failed. Your recording is safe on this device — use Retry." };
}

/* ---------------- Signed URLs (short-lived, on-demand only) ---------------- */

export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 120
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    const msg = (error?.message ?? "").toLowerCase();
    if (msg.includes("not found")) {
      throw { kind: "not_found", message: "The file is no longer available in storage." } satisfies AppError;
    }
    throw {
      kind: "unauthorized",
      message: "You don't have access to play this recording. Access is logged.",
    } satisfies AppError;
  }
  return data.signedUrl;
}
