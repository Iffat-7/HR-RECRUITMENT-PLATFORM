# Supabase Deployment Guide — TalentGate V1.2

This guide takes a **completely empty Supabase project** to a fully deployed V1.2 foundation in three copy-paste steps. It assumes nothing is installed yet — which is the safest possible starting state.

> **No secrets are needed or requested here.** Everything runs inside your own Supabase dashboard as the `postgres` role. The web app only ever needs the public anon key it already ships with.

---

## Step 0 — Open the SQL Editor

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and open project **khaxdoosuzzanardcnjx**.
2. In the left sidebar click **SQL Editor**.
3. Click **New query**. You will run each file as its own query, one at a time.
4. Leave the role selector on the default (**postgres**) — do not switch to `anon` or `authenticated` here.

---

## Step 1 — Run `supabase/migrations/0001_foundation.sql` (the starting point)

**What it does:** creates the entire relational foundation — 17 tables (roles, profiles, user_roles, candidates, positions, applications, questions, question_sets, question_set_questions, interviews, interview_questions, recordings, evaluation_categories, evaluations, evaluation_scores, status_history, audit_logs), seeds 4 roles + 7 scoring categories, installs triggers (auto-profile on signup, `updated_at`, random `CND-XXXXXXXX` reference codes), the core SECURITY DEFINER business functions, **Row Level Security on all 17 tables**, and the **3 private storage buckets** with owner-scoped policies.

**How:**
1. Open `supabase/migrations/0001_foundation.sql` in this repository.
2. Select all → copy → paste into the SQL Editor query window.
3. Click **Run**.
4. Expect: `Success. No rows returned` (the file is DDL — no result rows is correct).

---

## Step 2 — Run `supabase/migrations/0002_recording_pipeline.sql`

**What it does:** adds the V1.2 recording pipeline on top of Step 1 — `recordings.mime_type`, `interview_questions.is_required`, widened status domains (`SUPERSEDED`, question `COMPLETED/FAILED/REVIEWING/UPLOADING`), and the 7 recording-lifecycle SECURITY DEFINER functions: `start_interview`, `update_interview_question_status`, `prepare_recording`, `finalize_recording`, `fail_recording`, `submit_interview`, `update_candidate_files`. All ownership, attempt limits, MIME and size checks live here.

**How:** same as Step 1 — copy the whole file, paste, **Run**, expect `Success. No rows returned`.

> Order matters: 0002 references tables and functions created by 0001. Never run them out of order.

---

## Step 3 — Run `supabase/verify.sql`

**What it does:** an assertion script. It checks tables, RLS, bucket privacy, functions, and the V1.2 columns — and **raises an exception naming the exact failure** if anything is missing.

**How:** copy, paste, **Run**.

### What success looks like (exactly)

The Results panel shows a message like:

```
VERIFY PASSED: 17 tables · RLS on 17/17 · 3 private buckets · 12 functions · V1.2 columns present
```

(In the SQL Editor this appears under the **Messages** tab of the results.)

If you see that line, **your deployment succeeded.**

### What failure looks like

A red error beginning with `VERIFY FAILED:`, e.g. `VERIFY FAILED: expected 17 tables, found 0 — run 0001_foundation.sql`. The message tells you exactly which step to re-run.

---

## If a query fails

| Symptom | Meaning | Fix |
|---|---|---|
| `relation "..." already exists` in 0001 | A previous partial/complete run exists | 0001 is only meant for a first run. If tables already exist and verify passes, skip ahead. If it's a half-broken state, contact support or drop the `public` schema objects and restart from Step 1. |
| `policy "..." already exists` | 0001 ran successfully before | Skip to Step 3 — you're likely already done. |
| `permission denied for schema storage` | Query ran as the wrong role | Make sure the role selector shows **postgres**, then re-run. |
| `VERIFY FAILED: expected 17 tables, found N` | Step 1 missing/incomplete | Re-run 0001 in full, then 0002, then verify. |
| `VERIFY FAILED: ... 12 functions, found N` | Step 2 missing/incomplete | Re-run 0002, then verify. |
| `VERIFY FAILED: ... buckets are PUBLIC` | Buckets created public somehow | In Storage settings set the 3 buckets to private, or re-run 0001. |
| Any other error | Read the line number in the error | Fix that specific statement only; both migration files are safe to re-run statement-wise because tables use `IF NOT EXISTS`, functions use `CREATE OR REPLACE`, and seeds use `ON CONFLICT DO NOTHING`. |

**Re-run semantics (honest version):** `0002` and `verify.sql` are fully safe to re-run any time. `0001` is safe on an empty database; on a *partially migrated* one, re-running it is also fine for tables/functions/seeds, but its `CREATE POLICY` statements will error with "already exists" — that's deliberate, so a mistake can't be silently hidden. If verify already passes, don't re-run 0001.

---

## Confirm each piece after deployment (optional, belt-and-braces)

Run these small queries one at a time in the SQL Editor:

```sql
-- 1. The 17 foundation tables            → expected: 17
select count(*) from information_schema.tables where table_schema = 'public';

-- 2. RLS enabled everywhere                → expected: 17
select count(*) from pg_tables where schemaname = 'public' and rowsecurity;

-- 3. The three buckets, all private        → expected: 3 rows, public = false on every row
select id, name, public from storage.buckets
 where id in ('candidate-cvs','candidate-profile-photos','interview-recordings');

-- 4. The seven V1.2 RPC functions          → expected: 7 rows
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('start_interview','update_interview_question_status','prepare_recording',
                     'finalize_recording','fail_recording','submit_interview','update_candidate_files')
 order by 1;

-- 5. The two V1.2 columns                  → expected: 2 rows
select table_name, column_name from information_schema.columns
 where table_schema = 'public'
   and ((table_name = 'recordings' and column_name = 'mime_type')
     or (table_name = 'interview_questions' and column_name = 'is_required'));

-- 6. Seeds present                         → expected: 2 and 7
select count(*) from public.roles;
select count(*) from public.evaluation_categories;
```

**Important nuance about the SQL Editor:** it runs as `postgres`, which bypasses RLS — so `select * from public.candidates;` here will always work. That does **not** mean security is off. Real candidate isolation is enforced for the `authenticated` role (which is what the app uses), and is exercised by the Security section of `V1.2_SMOKE_TEST.md`.

---

## Create your first HR user

1. In the app, click **HR sign in** → register/login is handled by Supabase Auth. The simplest path: Dashboard → **Authentication** → **Users** → **Add user** → enter your email + password (uncheck "auto confirm" only if you want the email flow).
2. Then grant the HR role (SQL Editor):

```sql
insert into public.user_roles (user_id, role_id, granted_by)
select u.id, r.id, u.id
  from auth.users u, public.roles r
 where u.email = 'you@yourcompany.com'      -- ← your email
   and r.name = 'HR';
```

3. Sign in at `/login` — you'll land in the admin console.

**Note:** There are only two roles in the system:
- **HR** — The recruiter who manages candidates, positions, and evaluations
- **CANDIDATE** — The job seeker (assigned automatically when they register)

---

## Optional — Enable Google Sign-In

The app supports Google OAuth out of the box. To enable it:

### 1. Create a Google OAuth client
1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Click **Create credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Under **Authorized redirect URIs**, add:
   ```
   https://khaxdoosuzzanardcnjx.supabase.co/auth/v1/callback
   ```
   (Replace `khaxdoosuzzanardcnjx` with your actual project ref if different.)
5. Click **Create**. Copy the **Client ID** and **Client Secret**.

### 2. Configure Supabase
1. In Supabase Dashboard → **Authentication → Providers → Google**.
2. Toggle **Enable** on.
3. Paste the **Client ID** and **Client Secret** from step 1.
4. Click **Save**.

### 3. Run the Google Sign-In migration
In the SQL Editor, run `supabase/migrations/0003_google_signin.sql`. This updates the `handle_new_user` trigger to also capture `avatar_url` from Google's OAuth metadata.

### 4. Test it
Go to `/login` → click **Continue with Google**. After the OAuth flow, you'll be redirected back and signed in. First-time users land on the candidate portal to complete registration.

> **Note:** Google Sign-In is optional. The email/password flow works independently and is always available.

---

## Environment variables (for the frontend only)

Already documented in `.env.example`. Only two exist, both public-by-design:

- `VITE_SUPABASE_URL` — your project URL (already preconfigured for this project)
- `VITE_SUPABASE_ANON_KEY` — the anon key (already preconfigured for this project)

The **service-role key must never be added** to this frontend. Nothing else needs configuring.

## Safe testing after deployment

Follow `V1.2_SMOKE_TEST.md` top to bottom — it covers the candidate flow, the recorder, HR playback, and the security boundary tests, with a browser matrix for manual device testing.

---

**Deployment is only complete when Step 3 prints `VERIFY PASSED`.** Until then, the app intentionally shows a "database foundation required" setup state rather than pretending to work.
