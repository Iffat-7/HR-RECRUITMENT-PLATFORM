import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Copy } from "lucide-react";
import { cn, copyText } from "../lib/utils";
import { Badge } from "./ui/core";
import type { StatusTone } from "../types";

/* ---------------- Breadcrumbs + page header ---------------- */

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {c.to ? (
            <Link to={c.to} className="transition-colors hover:text-primary-700">
              {c.label}
            </Link>
          ) : (
            <span className="text-ink-700">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  crumbs,
  actions,
}: {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div>
        {crumbs && (
          <div className="mb-2">
            <Breadcrumbs items={crumbs} />
          </div>
        )}
        <h1 className="font-display text-[26px] font-bold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------- Role badge ---------------- */

const ROLE_TONES: Record<string, StatusTone> = {
  HR: "info",
  CANDIDATE: "success",
};

export function RoleBadge({ role }: { role: string }) {
  return <Badge tone={ROLE_TONES[role] ?? "neutral"}>{role.replace(/_/g, " ")}</Badge>;
}

/* ---------------- Copyable mono chip ---------------- */

export function CopyChip({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(value)) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        }
      }}
      title={label ? `Copy ${label}` : "Copy"}
      className="group inline-flex items-center gap-1.5 rounded-md border border-line bg-ink-900/3 px-2 py-1 font-mono text-xs font-semibold text-ink-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
    >
      {value}
      {copied ? (
        <Check className="h-3 w-3 text-success-600" />
      ) : (
        <Copy className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

/* ---------------- Scroll reveal ---------------- */

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("is-visible");
            io.disconnect();
          }
        });
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("reveal", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------------- Definition row ---------------- */

export function DefRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line/70 py-2.5 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
        {label}
      </dt>
      <dd className="text-sm font-medium text-ink-900 sm:text-right">{children}</dd>
    </div>
  );
}
