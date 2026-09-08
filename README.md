# TalentGate — HR Recruitment & Video Interview Platform

**V1.2 — Candidate File Uploads + Browser Video/Audio Recording**

A recruitment platform where candidates register, upload CV/photo, and record video/audio answers in-browser with prep timers, hard time caps, previews, retake limits and resumable uploads; HR reviewers play answers back through short-lived signed URLs and score candidates with a full audit trail.

> Milestones: V1.1 shipped the foundation (schema, RLS, auth, storage, consoles). V1.2 adds the real recording pipeline. Transcription/AI assist, reports and integrations remain staged for V1.3–V1.4.

## V1.2 database migration

Run `supabase/migrations/0002_recording_pipeline.sql` after 0001 (SQL Editor → Run). It adds:

- `recordings.mime_type`, widened status domains (`SUPERSEDED`, question `COMPLETED/FAILED/REVIEWING/UPLOADING`), `interview_questions.is_required` (backfilled)
- SECURITY DEFINER lifecycle functions: `start_interview` (server-side CV gate), `update_interview_question_status` (cannot set COMPLETED), `prepare_recording` → `finalize_recording` / `fail_recording` (two-phase upload; paths minted server-side; attempts, MIME, size and duration enforced in Postgres), `submit_interview` (blocks until required answers are in), `update_candidate_files`
- `supabase/verify.sql` — assertion script: 17 tables, RLS 17/17, 3 private buckets, 12 functions, V1.2 columns

## Recording & upload flow

1. Candidate starts the interview (`start_interview` — requires CV, sets statuses + history + audit)
2. Per question: device check → prep countdown → recording (auto-stop at `maximum_duration_seconds`) → local preview → retake (limited, enforced in DB) or submit
3. Submit = two-phase: `prepare_recording` validates ownership/attempts/MIME and returns a server-generated path `{candidate_id}/interviews/{interview_id}/{question_id}/{uuid}.{ext}`; the blob uploads via XHR with progress; `finalize_recording` flips the row to UPLOADED, supersedes the previous take (kept for audit) and marks the question COMPLETED
4. Refresh mid-flight? Uploaded answers persist; interrupted uploads are marked FAILED on resume without consuming an attempt
5. `submit_interview` locks the session, moves candidate → UNDER_REVIEW with status history
6. HR plays answers on the candidate profile via 120-second signed URLs (metadata-only listing; no public links anywhere)

**Browser note:** MIME is negotiated via `MediaRecorder.isTypeSupported` (webm/opus on Chrome/Edge/Firefox/Android, mp4 on Safari). Device errors are mapped to human-readable help; streams are released on unmount.

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

**Start here:** [`SUPABASE_DEPLOYMENT.md`](SUPABASE_DEPLOYMENT.md) — step-by-step deployment for an empty project, and [`V1.2_SMOKE_TEST.md`](V1.2_SMOKE_TEST.md) for post-deployment testing.

1. Create a project at supabase.com (or use the provided project).
2. Open **SQL Editor**, paste the entire contents of `supabase/migrations/0001_foundation.sql` and run it. This creates:
   - 17 tables with UUID keys, FKs, CHECK/UNIQUE constraints and indexes
   - 4 seeded roles + 7 seeded evaluation categories
   - Triggers: profile auto-provisioning, `updated_at`, candidate reference codes
   - SECURITY DEFINER business functions (status changes, interview creation, set composition, evaluation submission, audit logging)
   - RLS enabled on every table with role-aware policies
   - 3 **private** storage buckets with per-owner policies
3. (Optional) Auth → Providers → Email: adjust confirmation settings to taste; the candidate flow handles the "confirm your email" case.
4. Create your first **HR** user: sign the user up via Auth, then in SQL:

```sql
insert into public.user_roles (user_id, role_id)
select u.id, r.id from auth.users u, public.roles r
where u.email = 'you@company.com' and r.name = 'HR';
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

## Current scope (V1.1 + V1.2)

**In:** schema & migrations (0001 + 0002), RLS, roles + role assignment UI, auth & protected routes, candidate registration (validated, consent-captured), positions/questions/question-sets CRUD + builder, interview creation with frozen snapshots, evaluation submission with DB-driven categories, audit log viewer, live platform-health console, **CV + photo uploads (validated, progress, retry)**, **in-browser video/audio recording with prep timer, hard duration cap, preview, DB-enforced retake limits, two-phase resumable uploads, refresh-resume**, and **HR signed-URL playback**.

**Out (by design):** transcripts & AI assist (V1.3), reports (V1.3), WhatsApp/n8n/CRM/email (V1.4), true multipart/resumable-chunk uploads (V1.2 ships reliable retryable uploads — see code comments), candidate-side playback of own recordings (not requested).

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

- ~~**V1.2** — MediaRecorder capture (video/audio/either), prep timer, max duration & retakes, resumable private uploads, CV/photo upload widgets.~~ ✅ shipped
- **V1.3** — transcription, reviewer-assist summaries (human decides), reporting dashboards.
- **V1.4** — WhatsApp notifications, n8n hooks, CRM & email integrations.
