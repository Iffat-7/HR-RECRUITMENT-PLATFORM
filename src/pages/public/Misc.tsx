import { Link, useNavigate } from "react-router-dom";
import { Compass, ShieldAlert } from "lucide-react";
import { Button, Logo } from "../../components/ui/core";
import { useAuth } from "../../hooks/useAuth";
import { RoleBadge } from "../../components/shared";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
      <Logo />
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-400">Error 404</p>
      <h1 className="max-w-md font-display text-3xl font-bold tracking-tight text-ink-900">
        This page slipped out of the pipeline.
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-ink-500">
        The address doesn't exist — or you don't have access to it. Either way, there's nothing to see here.
      </p>
      <div className="flex gap-2">
        <Link to="/">
          <Button variant="outline" icon={<Compass className="h-4 w-4" />}>
            Home
          </Button>
        </Link>
        <Link to="/login">
          <Button>HR sign in</Button>
        </Link>
      </div>
    </div>
  );
}

export function Forbidden() {
  const { roles, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-100 text-danger-600">
        <ShieldAlert className="h-7 w-7" />
      </span>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-400">Error 403 — access denied</p>
      <h1 className="max-w-md font-display text-3xl font-bold tracking-tight text-ink-900">
        Your account doesn't hold an HR role.
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-ink-500">
        Knowing the URL isn't enough — the console checks your roles against PostgreSQL on every request.
        {roles.length > 0 ? (
          <> Your current roles: {roles.map((r) => <RoleBadge key={r} role={r} />)}.</>
        ) : (
          <> No roles are currently assigned to this account.</>
        )}{" "}
        Ask a Super Admin to grant you access under Team &amp; Roles.
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
        >
          Switch account
        </Button>
        <Link to="/candidate">
          <Button>Candidate portal</Button>
        </Link>
      </div>
    </div>
  );
}
