import { supabase } from "../lib/supabase/client";
import type { AuditLog, Profile, Role, UserRoleGrant } from "../types";
import { unwrap, pageRange, type PageParams } from "./base";

export interface ProfileWithRoles extends Profile {
  user_roles: Array<UserRoleGrant & { roles: Pick<Role, "name" | "id"> | null }>;
}

export async function listProfiles(): Promise<ProfileWithRoles[]> {
  const res = await supabase
    .from("profiles")
    .select(`*, user_roles(id, user_id, role_id, granted_at, roles(id, name))`)
    .order("created_at", { ascending: false });
  return (unwrap(res) as ProfileWithRoles[]) ?? [];
}

export async function listRoles(): Promise<Role[]> {
  const res = await supabase.from("roles").select("*").order("name", { ascending: true });
  return unwrap(res) as Role[];
}

/** Grant is enforced server-side: RLS only allows HR inserts. */
export async function grantRole(userId: string, roleId: string): Promise<void> {
  const res = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role_id: roleId, granted_by: (await supabase.auth.getUser()).data.user?.id ?? null })
    .select("id");
  unwrap(res);
}

export async function revokeRole(grantId: string): Promise<void> {
  unwrap(await supabase.from("user_roles").delete().eq("id", grantId).select("id"));
}

export interface AuditFilters extends PageParams {
  action?: string;
  entityType?: string;
}

export async function listAuditLogs(f: AuditFilters = {}): Promise<{ rows: AuditLog[]; count: number }> {
  let q = supabase.from("audit_logs").select("*", { count: "exact" });
  if (f.action) q = q.ilike("action", `%${f.action.replace(/[,%]/g, "")}%`);
  if (f.entityType) q = q.eq("entity_type", f.entityType);
  const [from, to] = pageRange({ page: f.page ?? 0, pageSize: f.pageSize ?? 30 });
  const res = await q.order("created_at", { ascending: false }).range(from, to);
  return { rows: unwrap(res) as AuditLog[], count: res.count ?? 0 };
}
