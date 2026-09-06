import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Info,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import { cn, type AppError } from "../../lib/utils";
import { Button } from "./core";

/* ---------------- Toasts ---------------- */

type ToastKind = "success" | "error" | "info" | "warning";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<{ push: (kind: ToastKind, message: string) => void } | null>(
  null
);

let toastSeq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = toastSeq++;
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4600);
  }, []);

  const icons: Record<ToastKind, ReactNode> = {
    success: <CheckCircle2 className="h-4.5 w-4.5 text-success-600" />,
    error: <XCircle className="h-4.5 w-4.5 text-danger-600" />,
    info: <Info className="h-4.5 w-4.5 text-primary-600" />,
    warning: <AlertTriangle className="h-4.5 w-4.5 text-warning-600" />,
  };

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-white/95 px-3.5 py-3 shadow-pop backdrop-blur animate-toast-in"
          >
            <span className="mt-px shrink-0">{icons[t.kind]}</span>
            <p className="flex-1 text-[13px] leading-snug font-medium text-ink-700">{t.message}</p>
            <button
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="shrink-0 rounded p-0.5 text-ink-400 transition-colors hover:text-ink-900"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-navy-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6 animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={ref}
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-white shadow-pop animate-scale-in sm:rounded-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white/95 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-ink-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-900"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-relaxed text-ink-700">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------------- Empty / Error states ---------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-white/60 px-6 py-14 text-center">
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        {icon}
      </span>
      <h3 className="font-display text-base font-bold text-ink-900">{title}</h3>
      <p className="max-w-sm text-[13px] leading-relaxed text-ink-500">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  compact,
}: {
  error: AppError;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const isSchema = error.kind === "schema_missing";
  return (
    <div
      className={cn(
        "rounded-xl border px-5 text-left",
        isSchema ? "border-warning-600/30 bg-warning-100/60" : "border-danger-600/25 bg-danger-100/50",
        compact ? "py-4" : "py-10"
      )}
      role="alert"
    >
      <div className="mx-auto flex max-w-lg flex-col items-start gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            isSchema ? "bg-warning-600/15 text-warning-700" : "bg-danger-600/15 text-danger-700"
          )}
        >
          {isSchema ? <Database className="h-4.5 w-4.5" /> : <AlertTriangle className="h-4.5 w-4.5" />}
        </span>
        <div>
          <h3 className="font-display text-sm font-bold text-ink-900">
            {isSchema ? "Database foundation required" : "Something went wrong"}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-700">{error.message}</p>
          {isSchema && (
            <ol className="mt-3 list-decimal space-y-1 pl-5 font-mono text-xs leading-relaxed text-ink-700">
              <li>Open Supabase Dashboard → SQL Editor</li>
              <li>Paste &amp; run supabase/migrations/0001_foundation.sql</li>
              <li>Reload this page</li>
            </ol>
          )}
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} icon={<RefreshCw className="h-3.5 w-3.5" />}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
