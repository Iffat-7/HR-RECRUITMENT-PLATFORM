import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { STATUS_LABELS, STATUS_TONES, type StatusTone } from "../../types";

/* ---------------- Logo ---------------- */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-primary-600" />
      <path d="M12 10.5v11l9-5.5z" fill="#fff" />
      <rect x="7" y="9" width="2.6" height="14" rx="1.3" className="fill-primary-300" />
    </svg>
  );
}

export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-none">
        <span
          className={cn(
            "block font-display text-[17px] font-700 font-bold tracking-tight",
            dark ? "text-white" : "text-ink-900"
          )}
        >
          TalentGate
        </span>
        <span
          className={cn(
            "mt-0.5 block font-mono text-[9.5px] font-medium uppercase tracking-[0.18em]",
            dark ? "text-navy-300" : "text-ink-400"
          )}
        >
          Recruit · Record · Review
        </span>
      </span>
    </span>
  );
}

/* ---------------- Button ---------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "navy";
type ButtonSize = "xs" | "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const variantCls: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm shadow-primary-900/20",
  secondary: "bg-primary-50 text-primary-700 hover:bg-primary-100 active:bg-primary-200",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-900/5 active:bg-ink-900/10",
  outline:
    "bg-white text-ink-700 border border-line-strong hover:border-primary-400 hover:text-primary-700 active:bg-primary-50",
  danger: "bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-700",
  navy: "bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-600 border border-navy-600/60",
};

const sizeCls: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs gap-1.5",
  sm: "h-8.5 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-lg font-semibold transition-all duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
        "disabled:cursor-not-allowed disabled:opacity-55",
        variantCls[variant],
        sizeCls[size],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

/* ---------------- Badge / Status ---------------- */

const toneCls: Record<StatusTone, string> = {
  neutral: "bg-ink-900/6 text-ink-500 ring-ink-900/10",
  info: "bg-primary-50 text-primary-700 ring-primary-200",
  success: "bg-success-100 text-success-700 ring-success-600/20",
  warning: "bg-warning-100 text-warning-700 ring-warning-600/20",
  danger: "bg-danger-100 text-danger-700 ring-danger-600/20",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot,
}: {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset",
        toneCls[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONES[status] ?? "neutral";
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}

/* ---------------- Card ---------------- */

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-line bg-card shadow-[0_1px_2px_rgb(14_27_48/0.04)]",
        onClick && "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ---------------- Loading ---------------- */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-primary-600", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-ink-900/8", className)} />;
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink-400">
      <Spinner className="h-6 w-6" />
      <p className="font-mono text-xs uppercase tracking-[0.16em]">{label}</p>
    </div>
  );
}
