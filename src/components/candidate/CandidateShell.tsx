import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Check, LogOut } from "lucide-react";
import { cn, initials } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { Logo } from "../ui/core";

const STEPS = [
  { to: "/candidate/register", label: "Register" },
  { to: "/candidate/instructions", label: "Instructions" },
  { to: "/candidate/interview", label: "Interview" },
  { to: "/candidate/complete", label: "Complete" },
];

export default function CandidateShell() {
  const { candidate, profile, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeIndex = STEPS.findIndex((s) => location.pathname.startsWith(s.to));
  const name = candidate?.full_name || profile?.full_name || user?.email || "Candidate";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/candidate" aria-label="Candidate home">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block max-w-40 truncate text-[13px] leading-tight font-semibold text-ink-900">{name}</span>
              {candidate && (
                <span className="block font-mono text-[10px] tracking-wider text-ink-400">{candidate.reference_code}</span>
              )}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 font-display text-[11px] font-bold text-primary-700">
              {initials(name)}
            </span>
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-danger-600"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
        {/* Progress steps */}
        <nav aria-label="Interview progress" className="mx-auto max-w-5xl px-4 pb-3 sm:px-6">
          <ol className="flex items-center gap-1.5">
            {STEPS.map((s, i) => {
              const done = activeIndex > i || (s.to === "/candidate/register" && !!candidate);
              const active = i === activeIndex;
              return (
                <li key={s.to} className="flex flex-1 items-center gap-1.5 last:flex-none">
                  <Link
                    to={s.to}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider transition-all duration-200",
                      active
                        ? "bg-primary-600 text-white shadow-sm shadow-primary-900/25"
                        : done
                          ? "bg-success-100 text-success-700"
                          : "bg-ink-900/5 text-ink-400 hover:bg-ink-900/8"
                    )}
                  >
                    {done && !active ? <Check className="h-3 w-3" /> : <span>{String(i + 1).padStart(2, "0")}</span>}
                    <span className="hidden xs:inline sm:inline">{s.label}</span>
                  </Link>
                  {i < STEPS.length - 1 && (
                    <span className={cn("h-px flex-1", done ? "bg-success-600/40" : "bg-line-strong")} />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-5xl px-6 pb-8">
        <p className="border-t border-line pt-4 font-mono text-[10.5px] tracking-wide text-ink-400">
          Your data is stored securely. Recordings are private — only the recruitment team reviewing your application can access them.
        </p>
      </footer>
    </div>
  );
}
