import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  ClipboardCheck,
  Clapperboard,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { cn, initials } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { Logo } from "../ui/core";
import { RoleBadge } from "../shared";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  tag?: string;
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, end: true }],
  },
  {
    label: "Pipeline",
    items: [
      { to: "/admin/candidates", label: "Candidates", icon: <UsersRound className="h-4 w-4" /> },
      { to: "/admin/positions", label: "Positions", icon: <Briefcase className="h-4 w-4" /> },
    ],
  },
  {
    label: "Interview studio",
    items: [
      { to: "/admin/questions", label: "Question bank", icon: <Clapperboard className="h-4 w-4" /> },
      { to: "/admin/question-sets", label: "Question sets", icon: <ClipboardCheck className="h-4 w-4" /> },
      { to: "/admin/evaluations", label: "Evaluations", icon: <ShieldCheck className="h-4 w-4" /> },
      { to: "/admin/reports", label: "Reports", icon: <BarChart3 className="h-4 w-4" />, tag: "V1.3" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/users", label: "Team & roles", icon: <Users className="h-4 w-4" /> },
      { to: "/admin/audit-logs", label: "Audit logs", icon: <ScrollText className="h-4 w-4" /> },
      { to: "/admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <Logo dark />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Admin navigation">
        {NAV.map((group) => (
          <div key={group.label} className="mt-4 first:mt-0">
            <p className="px-2.5 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-navy-300/70">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-all duration-150",
                        isActive
                          ? "bg-navy-700 text-white shadow-[inset_2px_0_0_var(--color-primary-400)]"
                          : "text-navy-200 hover:bg-navy-800 hover:text-white"
                      )
                    }
                  >
                    <span className="opacity-80 transition-opacity group-hover:opacity-100">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.tag && (
                      <span className="rounded bg-navy-600/70 px-1.5 py-px font-mono text-[9px] font-semibold tracking-wider text-navy-200">
                        {item.tag}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-navy-700/60 px-5 py-4">
        <p className="font-mono text-[10px] leading-relaxed tracking-wide text-navy-300/80">
          V1.1 — FOUNDATION
          <br />
          Recorder ships in V1.2
        </p>
      </div>
    </div>
  );
}

export default function AdminShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { profile, user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.email || "Team member";

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-navy-900 navy-texture lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-navy-900 shadow-pop animate-fade-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 rounded-lg p-1.5 text-navy-300 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-900/5 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 sm:block">
              HR Console
            </span>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-full border border-line bg-white py-1 pr-3 pl-1 transition-all hover:border-primary-300 hover:shadow-sm"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-primary-600 font-display text-[11px] font-bold text-white">
                {initials(displayName)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-36 truncate text-[13px] leading-tight font-semibold text-ink-900">
                  {displayName}
                </span>
                <span className="block font-mono text-[9.5px] uppercase tracking-wider text-ink-400">
                  {roles[0]?.replace(/_/g, " ") ?? "No role"}
                </span>
              </span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-white p-2 shadow-pop animate-scale-in" role="menu">
                  <div className="border-b border-line px-3 pt-2 pb-3">
                    <p className="truncate text-sm font-semibold text-ink-900">{displayName}</p>
                    <p className="truncate text-xs text-ink-400">{user?.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {roles.length > 0 ? (
                        roles.map((r) => <RoleBadge key={r} role={r} />)
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
                          No roles assigned
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    role="menuitem"
                    onClick={async () => {
                      setMenuOpen(false);
                      await signOut();
                      navigate("/login");
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-danger-600 transition-colors hover:bg-danger-100/70"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>

        <footer className="border-t border-line px-6 py-4">
          <p className="font-mono text-[10.5px] tracking-wide text-ink-400">
            TalentGate V1.1 · Authorization enforced by PostgreSQL Row Level Security · Recordings private by design
          </p>
        </footer>
      </div>
    </div>
  );
}
