import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase/client";
import type { Candidate, Profile, RoleName } from "../types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  roles: RoleName[];
  candidate: Candidate | null;
  /** true while the very first session load is in flight */
  initializing: boolean;
  /** false once we know the foundation migration is missing */
  dbReady: boolean;
  isHr: boolean;
  hasRole: (...roles: RoleName[]) => boolean;
  signOut: () => Promise<void>;
  refreshIdentity: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const HR_ROLES: RoleName[] = ["HR"];

function isSchemaError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  const msg = (e?.message ?? "").toLowerCase();
  return (
    !!e?.code?.startsWith("PGRST2") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [dbReady, setDbReady] = useState(true);

  const refreshIdentity = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    setUser(u);
    if (!u) {
      setProfile(null);
      setRoles([]);
      setCandidate(null);
      return;
    }
    // Profile
    try {
      const { data: p, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();
      if (error) {
        if (isSchemaError(error)) setDbReady(false);
        setProfile(null);
      } else {
        setProfile((p as Profile) ?? null);
      }
    } catch {
      setProfile(null);
    }
    // Roles (SECURITY DEFINER function — never lies about other users' roles)
    try {
      const { data: r, error } = await supabase.rpc("get_user_roles");
      if (error) {
        if (isSchemaError(error)) setDbReady(false);
        setRoles([]);
      } else {
        setRoles(((r ?? []) as { role_name: string }[]).map((x) => x.role_name as RoleName));
      }
    } catch {
      setRoles([]);
    }
    // Candidate record (for the candidate portal)
    try {
      const { data: c } = await supabase
        .from("candidates")
        .select("*, positions(id, title, department)")
        .eq("user_id", u.id)
        .maybeSingle();
      setCandidate((c as Candidate) ?? null);
    } catch {
      setCandidate(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      refreshIdentity().finally(() => mounted && setInitializing(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      refreshIdentity();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshIdentity]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setCandidate(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      roles,
      candidate,
      initializing,
      dbReady,
      isHr: roles.some((r) => HR_ROLES.includes(r)),
      hasRole: (...rs) => rs.some((r) => roles.includes(r)),
      signOut,
      refreshIdentity,
    }),
    [user, profile, roles, candidate, initializing, dbReady, signOut, refreshIdentity]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
