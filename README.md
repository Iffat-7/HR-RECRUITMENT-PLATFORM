# TalentGate — HR Recruitment & Video Interview Platform

**V1.1 — Foundation, Architecture & Database**

A recruitment platform where candidates register, complete position-specific interview questions and (in a later milestone) record video/audio answers in-browser; HR recruiters and reviewers manage the pipeline, score candidates and keep a full audit trail.

> V1.1 deliberately stops at the foundation: schema, RLS, auth, storage structure, admin console shell, candidate portal shell, validation and service layers. No recorder, no AI, no integrations yet — those are staged for V1.2–V1.4.

---

## Technology stack

| Layer        | Choice                                                            |
| ------------ | ----------------------------------------------------------------- |
| Frontend     | React 18 + TypeScript (Vite build)                                |
| Styling      | Tailwind CSS v4                                                    |
| Routing      | react-router-dom (HashRouter for static hosting — swap for BrowserRouter behind rewrites) |
| Backend      | Supabase: PostgreSQL, Supabase Auth, Supabase Storage              |
| Validation   | Zod (shared by forms; mirrored by DB CHECK constraints)            |
| Forms        | React Hook Form + @hookform/resolvers                              |

**Architecture note:** the original spec targets Next.js App Router. This environment builds and serves a static Vite SPA, so the server-side layer is Supabase itself — authorization is enforced in PostgreSQL (RLS + SECURITY DEFINER functions), not in app-server code. All business logic lives in `src/services/*` (framework-agnostic) and in database functions, so migrating the UI to Next.js later is a transport change, not a rewrite.

---

## Local setup

```bash
npm install
npm run dev        # local dev server
npm run build      # production build (dist/)
npm run typecheck  # strict TypeScript check
```

## Environment variables

Copy `.env.example` → `.env.local`. Only two variables exist, both safe for browsers:

| Variable               | Source                                                        |
| ---------------------- | ------------------------------------------------------------- |
| `VITE_SUPABASE_URL`    | Dashboard → Project Settings → API → Project URL              |
| `VITE_SUPABASE_ANON_KEY` | Dashboard → Project Settings → API → anon/public key        |

The **service-role key is never referenced** anywhere in this codebase and must never be added with a `VITE_` prefix.

## Supabase setup

1. Create a project at supabase.com (or use the provided project).
2. Open **SQL Editor**, paste the entire contents of `supabase/migrations/0001_foundation.sql` and run it. This creates:
   - 17 tables with UUID keys, FKs, CHECK/UNIQUE constraints and indexes
   - 4 seeded roles + 7 seeded evaluation categories
   - Triggers: profile auto-provisioning, `updated_at`, candidate reference codes
   - SECURITY DEFINER business functions (status changes, interview creation, set composition, evaluation submission, audit logging)
   - RLS enabled on every table with role-aware policies
   - 3 **private** storage buckets with per-owner policies
3. (Optional) Auth → Providers → Email: adjust confirmation settings to taste; the candidate flow handles the "confirm your email" case.
4. Create your first **SUPER_ADMIN**: sign the user up via Auth, then in SQL:

```sql
insert into public.user_roles (user_id, role_id)
select u.id, r.id from auth.users u, public.roles r
where u.email = 'you@company.com' and r.name = 'SUPER_ADMIN';
```

5. Reload the app — the landing page's live console and Admin → Settings report per-subsystem health.

## Folder structure

```
src/
  components/
    ui/            core (buttons, badges, cards), fields, feedback (modal, toast, states)
    admin/         AdminShell — sidebar, header, user menu
    candidate/     CandidateShell — progress steps header
    shared.tsx     page header, breadcrumbs, copy chip, scroll reveal
  hooks/useAuth.tsx        session + roles + candidate identity
  lib/
    supabase/      browser client (anon key only)
    validation/    Zod schemas
    utils.ts       error classification, formatting
  pages/
    public/        Landing, Login, 404/403
    admin/         Dashboard, Candidates(+detail), Positions, Questions,
                   QuestionSets(+builder), Evaluations, Reports, Users, AuditLogs, Settings
    candidate/     Home, Register, Instructions, Interview, Complete
  services/        candidates, catalog, interviews, evaluations, admin, system
  types/           domain types + status/tone maps
supabase/migrations/0001_foundation.sql
```

## Security model

- **RLS on all 17 tables.** Candidates read only rows where `candidates.user_id = auth.uid()`; HR visibility comes from `user_roles`, evaluated in Postgres on every request.
- **Role checks are server-side.** `has_hr_role()` is a SECURITY DEFINER function; UI route guards mirror it but are never the only defense.
- **Business logic in the DB.** Status change = atomic update + `status_history` + `audit_logs` in one definer function; interviews snapshot questions so bank edits can't rewrite live interviews.
- **Private storage.** No public buckets; paths are `{candidate_id}/…` and policies only allow the owning candidate or HR. Playback will use expiring signed URLs (V1.2).
- **No secrets in the client.** Only the anon key ships; reference codes are random so candidate counts can't be guessed; CNIC is masked in the UI.

## V1.1 scope

**In:** schema & migrations, RLS, roles + role assignment UI, auth & protected routes, candidate registration (validated, consent-captured), positions/questions/question-sets CRUD + builder, interview creation with frozen snapshots, evaluation submission with DB-driven categories, audit log viewer, honest empty/loading/error states, live platform-health console.

**Out (by design):** recording capture/uploads (V1.2), transcripts & AI assist (V1.3), reports (V1.3), WhatsApp/n8n/CRM/email (V1.4), CV/photo upload widgets (V1.2 — buckets ready).

## Testing

```bash
npm run build      # verified passing in this environment
npm run typecheck  # strict TS, verified passing
```

Database verification (run after the migration):

```sql
select count(*) from information_schema.tables where table_schema = 'public'; -- 17
select tablename from pg_tables where schemaname='public' and rowsecurity;    -- 17 rows
select id, name, public from storage.buckets;                                  -- 3, all private
```

RLS smoke test (SQL editor, as anon/another user): `select * from public.candidates;` must return 0 rows or be denied.

## Roadmap

- **V1.2** — MediaRecorder capture (video/audio/either), prep timer, max duration & retakes, resumable private uploads, CV/photo upload widgets.
- **V1.3** — transcription, reviewer-assist summaries (human decides), reporting dashboards.
- **V1.4** — WhatsApp notifications, n8n hooks, CRM & email integrations.
