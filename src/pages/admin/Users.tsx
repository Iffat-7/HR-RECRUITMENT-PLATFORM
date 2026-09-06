import { useCallback, useEffect, useState } from "react";
import { ShieldPlus, Trash2, Users } from "lucide-react";
import { grantRole, listProfiles, listRoles, revokeRole, type ProfileWithRoles } from "../../services/admin";
import { classifyError, formatDateTime, initials, type AppError } from "../../lib/utils";
import { Button, Card, Skeleton } from "../../components/ui/core";
import { Field, SelectInput } from "../../components/ui/fields";
import { ConfirmDialog, EmptyState, ErrorState, Modal, useToast } from "../../components/ui/feedback";
import { PageHeader, RoleBadge } from "../../components/shared";
import { useAuth } from "../../hooks/useAuth";
import type { Role, RoleName } from "../../types";

export default function UsersPage() {
  const [rows, setRows] = useState<ProfileWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [grantFor, setGrantFor] = useState<ProfileWithRoles | null>(null);
  const [grantRoleId, setGrantRoleId] = useState("");
  const [revoking, setRevoking] = useState<{ profile: ProfileWithRoles; grantId: string; role: RoleName } | null>(null);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();
  const { user: me } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ps, rs] = await Promise.all([listProfiles(), listRoles()]);
      setRows(ps);
      setRoles(rs);
    } catch (e) {
      setError(classifyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onGrant = async () => {
    if (!grantFor || !grantRoleId) return;
    setBusy(true);
    try {
      await grantRole(grantFor.id, grantRoleId);
      push("success", "Role granted.");
      setGrantFor(null);
      setGrantRoleId("");
      load();
    } catch (e) {
      push("error", classifyError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async () => {
    if (!revoking) return;
    setBusy(true);
    try {
      await revokeRole(revoking.grantId);
      push("success", "Role revoked.");
      setRevoking(null);
      load();
    } catch (e) {
      push("error", classifyError(e).message);
      setRevoking(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Team & roles"
        description="Accounts are provisioned through Supabase Auth by a Super Admin; roles are assigned here. Role checks happen in PostgreSQL — granting a role is what actually unlocks access."
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Team & roles" }]}
      />

      {error && <ErrorState error={error} onRetry={load} />}

      {loading && !error && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={<Users className="h-5.5 w-5.5" />}
          title="No team members yet"
          body="Invite users from the Supabase Auth dashboard, then assign SUPER_ADMIN, ADMIN, RECRUITER or REVIEWER roles here."
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <Card className="overflow-hidden animate-fade-up">
          <ul>
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 border-b border-line/70 px-5 py-3.5 last:border-0 hover:bg-primary-50/40">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 font-display text-xs font-bold text-white">
                  {initials(p.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink-900">
                    {p.full_name}
                    {p.id === me?.id && <span className="ml-1.5 font-mono text-[9.5px] uppercase tracking-wider text-primary-600">you</span>}
                  </p>
                  <p className="truncate text-xs text-ink-400">{p.email ?? "no email"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {p.user_roles.length === 0 ? (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-300">no roles</span>
                  ) : (
                    p.user_roles.map((g) => (
                      <span key={g.id} className="group inline-flex items-center gap-1">
                        <RoleBadge role={g.roles?.name ?? "?"} />
                        <button
                          onClick={() =>
                            setRevoking({ profile: p, grantId: g.id, role: (g.roles?.name ?? "?") as RoleName })
                          }
                          className="rounded p-1 text-ink-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-danger-100 hover:text-danger-600"
                          aria-label={`Revoke ${g.roles?.name} from ${p.full_name}`}
                          title="Revoke role"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <Button variant="outline" size="xs" onClick={() => { setGrantFor(p); setGrantRoleId(""); }} icon={<ShieldPlus className="h-3.5 w-3.5" />}>
                  Grant role
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={!!grantFor} onClose={() => setGrantFor(null)} title={`Grant role — ${grantFor?.full_name ?? ""}`} subtitle="Takes effect on the user's next page load. RLS policies re-evaluate roles per request.">
        <div className="space-y-4">
          <Field label="Role" required>
            <SelectInput value={grantRoleId} onChange={(e) => setGrantRoleId(e.target.value)}>
              <option value="" disabled>
                Select role…
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name.replace(/_/g, " ")} — {r.description ?? "system role"}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setGrantFor(null)}>
              Cancel
            </Button>
            <Button onClick={onGrant} loading={busy} disabled={!grantRoleId}>
              Grant role
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={onRevoke}
        danger
        loading={busy}
        title="Revoke role?"
        confirmLabel="Revoke"
        body={
          revoking
            ? `${revoking.profile.full_name} will lose ${revoking.role.replace(/_/g, " ")} immediately. They keep their account but lose access to HR data.`
            : ""
        }
      />

      {!loading && !error && rows.length > 0 && (
        <p className="mt-4 font-mono text-[10.5px] leading-relaxed text-ink-400">
          Role grants are written by {formatDateTime(new Date().toISOString()).split(",")[0]}-stamped rows in user_roles — inspect them any time in the audit trail.
        </p>
      )}
    </div>
  );
}
