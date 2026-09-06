import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  CheckCircle2,
  FileText,
  ImagePlus,
  RefreshCw,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { cn, formatBytes, classifyError } from "../../lib/utils";
import { extOf, uploadWithProgress, validateFile, type FileRules } from "../../services/storage";
import { getOwnFileUrl } from "../../services/recordings";
import { Button, Spinner } from "../ui/core";

type Stage =
  | { name: "idle" }
  | { name: "uploading"; pct: number }
  | { name: "error"; message: string }
  | { name: "success"; fileName: string; size: number };

/**
 * Private-bucket file upload with validation, progress, retry and replace.
 * Never produces public URLs — the stored value is a storage path only.
 */
export default function FileUpload({
  bucket,
  rules,
  currentPath,
  makePath,
  onUploaded,
  icon,
  compactLabel,
}: {
  bucket: string;
  rules: FileRules;
  currentPath: string | null;
  makePath: (ext: string) => string;
  onUploaded: (path: string) => Promise<void>;
  icon: "cv" | "photo";
  compactLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [pending, setPending] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);

  // On-demand signed URL for the stored photo (short-lived, candidate's own file)
  useEffect(() => {
    let live = true;
    if (icon === "photo" && currentPath) {
      getOwnFileUrl(bucket, currentPath)
        .then((u) => live && setThumb(u))
        .catch(() => undefined);
    }
    return () => {
      live = false;
    };
  }, [bucket, currentPath, icon]);

  const start = async (file: File) => {
    const problem = validateFile(file, rules);
    if (problem) {
      setStage({ name: "error", message: problem });
      return;
    }
    setPending(file);
    setStage({ name: "uploading", pct: 0 });
    try {
      const path = makePath(extOf(file.name));
      await uploadWithProgress(bucket, path, file, file.type || rules.mimes[0], (pct) =>
        setStage({ name: "uploading", pct })
      );
      await onUploaded(path);
      setStage({ name: "success", fileName: file.name, size: file.size });
    } catch (e) {
      setStage({ name: "error", message: classifyError(e).message });
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void start(file);
  };

  const Icon = icon === "cv" ? FileText : ImagePlus;
  const uploading = stage.name === "uploading";

  return (
    <div>
      {/* Current file summary */}
      {(currentPath || stage.name === "success") && !uploading && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-success-600/25 bg-success-100/50 px-3.5 py-2.5">
          {icon === "photo" && thumb ? (
            <img src={thumb} alt="Profile" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white" />
          ) : (
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-success-600" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-ink-900">
              {stage.name === "success" ? stage.fileName : compactLabel}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-success-700">
              {stage.name === "success" ? `${formatBytes(stage.size)} · stored privately` : "on file · stored privately"}
            </p>
          </div>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all duration-200",
          dragOver ? "border-primary-500 bg-primary-50" : "border-line-strong bg-paper/50 hover:border-primary-300",
          uploading && "pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={rules.accept.join(",")}
          className="sr-only"
          aria-label={`Choose ${rules.label}`}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void start(f);
            e.target.value = "";
          }}
        />

        {uploading ? (
          <div className="py-1">
            <div className="flex items-center justify-center gap-2 text-[13px] font-semibold text-primary-700">
              <Spinner className="h-4 w-4" /> Uploading… {stage.name === "uploading" ? stage.pct : 0}%
            </div>
            <div className="mx-auto mt-3 h-2 w-4/5 overflow-hidden rounded-full bg-ink-900/8">
              <div
                className="h-full rounded-full bg-primary-600 transition-[width] duration-200 ease-out"
                style={{ width: `${stage.name === "uploading" ? stage.pct : 0}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-400">
              Keep this tab open until it finishes
            </p>
          </div>
        ) : (
          <>
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-2 text-[13px] font-semibold text-ink-900">
              {currentPath || stage.name === "success" ? "Replace" : "Upload"} {rules.label.toLowerCase()}
            </p>
            <p className="mt-0.5 font-mono text-[10.5px] text-ink-400">
              {rules.accept.join(" · ")} · up to {rules.maxBytesLabel}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} icon={<UploadCloud className="h-3.5 w-3.5" />}>
                Choose file
              </Button>
              {stage.name === "error" && pending && (
                <Button type="button" variant="secondary" size="sm" onClick={() => void start(pending)} icon={<RefreshCw className="h-3.5 w-3.5" />}>
                  Retry
                </Button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-ink-400">…or drag &amp; drop it here</p>
          </>
        )}
      </div>

      {/* Validation / network error */}
      {stage.name === "error" && (
        <div role="alert" className="mt-2.5 flex items-start gap-2 rounded-lg border border-danger-600/25 bg-danger-100/60 px-3 py-2.5">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />
          <p className="text-[12.5px] leading-snug font-medium text-danger-700">{stage.message}</p>
        </div>
      )}
    </div>
  );
}
