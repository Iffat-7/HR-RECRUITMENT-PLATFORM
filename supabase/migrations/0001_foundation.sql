-- ============================================================================
-- TalentGate — V1.1 FOUNDATION MIGRATION
-- HR Recruitment & Video Interview Platform
--
-- Run this file in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- (or: supabase db push if using the Supabase CLI)
--
-- Contents:
--   1. Helper functions (audit, roles, triggers)
--   2. Tables + constraints + indexes + seed data
--   3. Business functions (SECURITY DEFINER — server-side logic)
--   4. Row Level Security policies (server-side authorization)
--   5. Private storage buckets + storage policies
--
-- Security notes:
--   * The service-role key is NEVER needed by the web client.
--   * SECURITY DEFINER functions are pinned to search_path = public.
--   * No table is publicly readable; candidates can only read their own rows.
-- ============================================================================

-- No extensions required: randomness uses pg_catalog.gen_random_uuid()
-- (PostgreSQL 13+ built-in), which resolves under ANY search_path — including
-- the `set search_path = public` pinned on the SECURITY DEFINER functions.
-- (pgcrypto lives in Supabase's `extensions` schema, so relying on it here
-- would break reference-code generation on a fresh project.)

-- ============================================================================
-- 1. HELPER FUNCTIONS
-- ============================================================================

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Non-sequential, unguessable candidate reference codes (CND-XXXXXXXX, 31-char alphabet)
create or replace function public.generate_candidate_reference()
returns trigger language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  hex32 text;
  code text;
  i int;
begin
  if new.reference_code is not null then
    return new;
  end if;
  loop
    -- 32 hex chars from a crypto-random UUID; each pair = one random byte.
    hex32 := replace(gen_random_uuid()::text, '-', '');
    code := 'CND-';
    for i in 0..7 loop
      code := code || substr(alphabet,
        (get_byte(decode(substr(hex32, i * 2 + 1, 2), 'hex'), 0) % 31) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.candidates c where c.reference_code = code);
  end loop;
  new.reference_code := code;
  return new;
end $$;

-- Auto-provision a profile when a user signs up (runs as table owner => bypasses RLS)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Append-only audit helper. Never stores passwords, tokens or secrets.
create or replace function public.log_audit(
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
end $$;

-- Role lookups (SECURITY DEFINER so they cannot be spoofed or blocked by RLS recursion)
create or replace function public.has_hr_role(p_roles text[] default '{SUPER_ADMIN,ADMIN,RECRUITER,REVIEWER}')
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = any (p_roles)
  );
$$;

create or replace function public.get_user_roles(p_user_id uuid default auth.uid())
returns table (role_name text, granted_at timestamptz)
language sql security definer stable set search_path = public as $$
  select r.name::text, ur.granted_at
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = p_user_id;
$$;

-- Candidate row owned by the signed-in user (used by storage policies)
create or replace function public.current_candidate_id()
returns uuid language sql security definer stable set search_path = public as $$
  select id from public.candidates where user_id = auth.uid() limit 1;
$$;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Roles ----------------------------------------------------------------------
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('SUPER_ADMIN','ADMIN','RECRUITER','REVIEWER')),
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.roles (name, description) values
  ('SUPER_ADMIN', 'Full platform control including role management'),
  ('ADMIN', 'Manage positions, questions, candidates and team'),
  ('RECRUITER', 'Run the pipeline: candidates, interviews, question sets'),
  ('REVIEWER', 'Review recordings and submit evaluations')
on conflict (name) do nothing;

-- Profiles -------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- User <-> Role mapping -------------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (user_id, role_id)
);

create index if not exists idx_user_roles_user on public.user_roles (user_id);

-- Positions ------------------------------------------------------------------
create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_positions_active on public.positions (is_active);
create trigger trg_positions_updated_at before update on public.positions
  for each row execute function public.set_updated_at();

-- Candidates -----------------------------------------------------------------
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  reference_code text unique, -- filled by trigger; never sequential
  user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  father_husband_name text,
  mobile text not null,
  email text,
  city text,
  cnic text, -- PII: masked in every HR-facing query/UI
  position_id uuid references public.positions (id) on delete set null,
  years_of_experience int check (years_of_experience >= 0 and years_of_experience <= 60),
  current_employer text,
  current_salary numeric(14,2) check (current_salary >= 0),
  expected_salary numeric(14,2) check (expected_salary >= 0),
  notice_period text,
  available_joining_date date,
  cv_path text,              -- storage path inside candidate-cvs (V1.2)
  profile_photo_path text,   -- storage path inside candidate-profile-photos (V1.2)
  consent_given boolean not null default false,
  consent_timestamp timestamptz,
  status text not null default 'NEW' check (status in
    ('NEW','SCREENING','INTERVIEW','UNDER_REVIEW','SHORTLISTED','OFFER','HIRED','REJECTED','WITHDRAWN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (consent_given = false or consent_timestamp is not null)
);

create index if not exists idx_candidates_user on public.candidates (user_id);
create index if not exists idx_candidates_status on public.candidates (status);
create index if not exists idx_candidates_created on public.candidates (created_at desc);
create trigger trg_candidates_reference before insert on public.candidates
  for each row execute function public.generate_candidate_reference();
create trigger trg_candidates_updated_at before update on public.candidates
  for each row execute function public.set_updated_at();

-- Applications ---------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete restrict,
  status text not null default 'APPLIED' check (status in
    ('APPLIED','SCREENING','INTERVIEW_SCHEDULED','INTERVIEW_IN_PROGRESS','INTERVIEW_SUBMITTED',
     'UNDER_REVIEW','SHORTLISTED','REJECTED','OFFER_EXTENDED','HIRED','WITHDRAWN')),
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id, position_id)
);

create index if not exists idx_applications_candidate on public.applications (candidate_id);
create index if not exists idx_applications_position on public.applications (position_id);
create trigger trg_applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- Question bank ---------------------------------------------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  category text,
  response_type text not null check (response_type in ('VIDEO','AUDIO','VIDEO_OR_AUDIO')),
  maximum_duration_seconds int not null default 120 check (maximum_duration_seconds between 10 and 1800),
  preparation_time_seconds int not null default 30 check (preparation_time_seconds between 0 and 600),
  maximum_retakes int not null default 2 check (maximum_retakes between 0 and 10),
  is_required boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_questions_category on public.questions (category);
create trigger trg_questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

-- Question sets (reusable interview templates) --------------------------------
create table if not exists public.question_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  position_id uuid references public.positions (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_question_sets_updated_at before update on public.question_sets
  for each row execute function public.set_updated_at();

create table if not exists public.question_set_questions (
  question_set_id uuid not null references public.question_sets (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  display_order int not null check (display_order >= 1),
  primary key (question_set_id, question_id),
  unique (question_set_id, display_order)
);

-- Interviews ------------------------------------------------------------------
create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  status text not null default 'NOT_STARTED' check (status in
    ('NOT_STARTED','IN_PROGRESS','COMPLETED','SUBMITTED','EXPIRED','CANCELLED')),
  started_at timestamptz,
  completed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_interviews_candidate on public.interviews (candidate_id);
create trigger trg_interviews_updated_at before update on public.interviews
  for each row execute function public.set_updated_at();

-- Interview questions — FROZEN SNAPSHOTS of the bank at creation time.
-- Admin edits to `questions` afterwards can never rewrite a live interview.
create table if not exists public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews (id) on delete cascade,
  question_id uuid references public.questions (id) on delete set null,
  question_text_snapshot text not null,
  response_type_snapshot text not null check (response_type_snapshot in ('VIDEO','AUDIO','VIDEO_OR_AUDIO')),
  maximum_duration_seconds int not null check (maximum_duration_seconds between 10 and 1800),
  preparation_time_seconds int not null check (preparation_time_seconds between 0 and 600),
  maximum_retakes int not null check (maximum_retakes between 0 and 10),
  display_order int not null check (display_order >= 1),
  status text not null default 'PENDING' check (status in
    ('PENDING','PREPARING','RECORDING','RECORDED','SKIPPED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interview_id, display_order)
);

create index if not exists idx_interview_questions_interview on public.interview_questions (interview_id);
create trigger trg_interview_questions_updated_at before update on public.interview_questions
  for each row execute function public.set_updated_at();

-- Recordings — metadata foundation for V1.2 uploads (no public URLs, ever)
create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  interview_question_id uuid not null references public.interview_questions (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  storage_path text not null,           -- path inside private bucket interview-recordings
  file_type text not null check (file_type in ('VIDEO','AUDIO')),
  file_size bigint check (file_size > 0),
  duration_seconds numeric check (duration_seconds >= 0),
  attempt_number int not null default 1 check (attempt_number >= 1),
  status text not null default 'UPLOADING' check (status in
    ('UPLOADING','UPLOADED','PROCESSING','TRANSCRIBED','FAILED','DELETED')),
  created_at timestamptz not null default now(),
  uploaded_at timestamptz
);

create index if not exists idx_recordings_question on public.recordings (interview_question_id);
create index if not exists idx_recordings_candidate on public.recordings (candidate_id);

-- Evaluation categories — configurable, never hardcoded in the UI
create table if not exists public.evaluation_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  min_score int not null default 0,
  max_score int not null default 5 check (max_score > min_score),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.evaluation_categories (name, description, sort_order) values
  ('Communication',        'Clarity, structure and articulation',       1),
  ('Confidence',           'Composure and self-assurance',              2),
  ('Relevant Experience',  'Depth of directly applicable experience',   3),
  ('Problem Solving',      'Reasoning quality and approach',            4),
  ('Professionalism',      'Presentation, tone and workplace maturity', 5),
  ('Technical Knowledge',  'Role-specific technical depth',             6),
  ('Overall Fit',          'Alignment with team and role expectations', 7)
on conflict (name) do nothing;

-- Evaluations -----------------------------------------------------------------
create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  interview_id uuid references public.interviews (id) on delete set null,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  overall_score numeric not null check (overall_score between 0 and 100),
  recommendation text not null check (recommendation in
    ('STRONG_HIRE','HIRE','MAYBE','NO_HIRE','STRONG_NO_HIRE')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_evaluations_candidate on public.evaluations (candidate_id);
create trigger trg_evaluations_updated_at before update on public.evaluations
  for each row execute function public.set_updated_at();

create table if not exists public.evaluation_scores (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations (id) on delete cascade,
  category_id uuid not null references public.evaluation_categories (id) on delete restrict,
  score numeric not null check (score >= 0 and score <= 10),
  unique (evaluation_id, category_id)
);

-- Status history ---------------------------------------------------------------
create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_status_history_candidate on public.status_history (candidate_id, created_at desc);

-- Audit logs --------------------------------------------------------------------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);
create index if not exists idx_audit_logs_user on public.audit_logs (user_id);

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 3. BUSINESS FUNCTIONS (run server-side in Postgres; role-checked inside)
-- ============================================================================

-- Atomic status transition: update + history + audit
create or replace function public.change_candidate_status(
  p_candidate_id uuid,
  p_new_status text,
  p_reason text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_old text;
begin
  if not public.has_hr_role('{SUPER_ADMIN,ADMIN,RECRUITER}') then
    raise exception 'Not authorized to change candidate status';
  end if;

  select status into v_old from public.candidates where id = p_candidate_id for update;
  if not found then
    raise exception 'Candidate not found';
  end if;
  if v_old = p_new_status then
    return;
  end if;

  update public.candidates set status = p_new_status where id = p_candidate_id;

  insert into public.status_history (candidate_id, old_status, new_status, changed_by, reason)
  values (p_candidate_id, v_old, p_new_status, auth.uid(), p_reason);

  perform public.log_audit('candidate.status_changed', 'candidate', p_candidate_id,
    jsonb_build_object('from', v_old, 'to', p_new_status));
end $$;

-- Instantiate an interview with FROZEN question snapshots
create or replace function public.create_interview(
  p_candidate_id uuid,
  p_application_id uuid,
  p_question_set_id uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_interview_id uuid;
  v_count int := 0;
begin
  if not public.has_hr_role('{SUPER_ADMIN,ADMIN,RECRUITER}') then
    raise exception 'Not authorized to create interviews';
  end if;

  insert into public.interviews (candidate_id, application_id, status)
  values (p_candidate_id, p_application_id, 'NOT_STARTED')
  returning id into v_interview_id;

  insert into public.interview_questions (
    interview_id, question_id, question_text_snapshot, response_type_snapshot,
    maximum_duration_seconds, preparation_time_seconds, maximum_retakes, display_order
  )
  select
    v_interview_id, q.id, q.question_text, q.response_type,
    q.maximum_duration_seconds, q.preparation_time_seconds, q.maximum_retakes,
    row_number() over (order by qsq.display_order)
  from public.question_set_questions qsq
  join public.questions q on q.id = qsq.question_id
  where qsq.question_set_id = p_question_set_id and q.is_active
  order by qsq.display_order;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    delete from public.interviews where id = v_interview_id;
    raise exception 'Question set contains no active questions';
  end if;

  perform public.log_audit('interview.created', 'interview', v_interview_id,
    jsonb_build_object('candidate_id', p_candidate_id, 'question_set_id', p_question_set_id, 'questions', v_count));

  return v_interview_id;
end $$;

-- Replace a set's ordered membership atomically
create or replace function public.set_question_set_questions(
  p_set_id uuid,
  p_question_ids uuid[]
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_hr_role('{SUPER_ADMIN,ADMIN,RECRUITER}') then
    raise exception 'Not authorized to modify question sets';
  end if;

  delete from public.question_set_questions where question_set_id = p_set_id;

  insert into public.question_set_questions (question_set_id, question_id, display_order)
  select p_set_id, qid, ord
  from unnest(p_question_ids) with ordinality as t(qid, ord);

  perform public.log_audit('question_set.updated', 'question_set', p_set_id,
    jsonb_build_object('count', coalesce(array_length(p_question_ids, 1), 0)));
end $$;

-- Submit an evaluation with per-category scores, atomically
create or replace function public.submit_evaluation(
  p_candidate_id uuid,
  p_interview_id uuid,
  p_overall numeric,
  p_recommendation text,
  p_notes text,
  p_category_ids uuid[],
  p_scores numeric[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_evaluation_id uuid;
begin
  if not public.has_hr_role('{SUPER_ADMIN,ADMIN,RECRUITER,REVIEWER}') then
    raise exception 'Not authorized to submit evaluations';
  end if;
  if coalesce(array_length(p_category_ids, 1), 0) <> coalesce(array_length(p_scores, 1), 0) then
    raise exception 'Category/score mismatch';
  end if;

  insert into public.evaluations (candidate_id, interview_id, reviewer_id, overall_score, recommendation, notes)
  values (p_candidate_id, p_interview_id, auth.uid(), p_overall, p_recommendation, p_notes)
  returning id into v_evaluation_id;

  insert into public.evaluation_scores (evaluation_id, category_id, score)
  select v_evaluation_id, p_category_ids[i], p_scores[i]
  from generate_subscripts(p_category_ids, 1) as i;

  perform public.log_audit('evaluation.submitted', 'evaluation', v_evaluation_id,
    jsonb_build_object('candidate_id', p_candidate_id, 'recommendation', p_recommendation, 'overall', p_overall));

  return v_evaluation_id;
end $$;

-- least-privilege: only signed-in users may call the business functions
revoke execute on function public.change_candidate_status(uuid, text, text) from public, anon;
revoke execute on function public.create_interview(uuid, uuid, uuid) from public, anon;
revoke execute on function public.set_question_set_questions(uuid, uuid[]) from public, anon;
revoke execute on function public.submit_evaluation(uuid, uuid, numeric, text, text, uuid[], numeric[]) from public, anon;
revoke execute on function public.log_audit(text, text, uuid, jsonb) from public, anon;
grant execute on function public.get_user_roles(uuid) to authenticated;
grant execute on function public.current_candidate_id() to authenticated;
grant execute on function public.change_candidate_status(uuid, text, text) to authenticated;
grant execute on function public.create_interview(uuid, uuid, uuid) to authenticated;
grant execute on function public.set_question_set_questions(uuid, uuid[]) to authenticated;
grant execute on function public.submit_evaluation(uuid, uuid, numeric, text, text, uuid[], numeric[]) to authenticated;
grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles               enable row level security;
alter table public.roles                  enable row level security;
alter table public.user_roles             enable row level security;
alter table public.candidates             enable row level security;
alter table public.positions              enable row level security;
alter table public.applications           enable row level security;
alter table public.questions              enable row level security;
alter table public.question_sets          enable row level security;
alter table public.question_set_questions enable row level security;
alter table public.interviews             enable row level security;
alter table public.interview_questions    enable row level security;
alter table public.recordings             enable row level security;
alter table public.evaluation_categories  enable row level security;
alter table public.evaluations            enable row level security;
alter table public.evaluation_scores      enable row level security;
alter table public.status_history         enable row level security;
alter table public.audit_logs             enable row level security;

-- profiles: own row + HR visibility ------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_hr_role());
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_hr_role('{SUPER_ADMIN,ADMIN}'))
  with check (id = auth.uid() or public.has_hr_role('{SUPER_ADMIN,ADMIN}'));

-- roles: readable by any signed-in user; mutations only via SQL console -------
create policy roles_select on public.roles for select to authenticated using (true);

-- user_roles: self-inspection + admin management -------------------------------
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_hr_role('{SUPER_ADMIN,ADMIN}'));
create policy user_roles_insert on public.user_roles for insert to authenticated
  with check (public.has_hr_role('{SUPER_ADMIN,ADMIN}'));
create policy user_roles_delete on public.user_roles for delete to authenticated
  using (public.has_hr_role('{SUPER_ADMIN,ADMIN}'));

-- candidates: own record only; HR sees all; no client deletes ------------------
create policy candidates_select on public.candidates for select to authenticated
  using (user_id = auth.uid() or public.has_hr_role());
create policy candidates_insert on public.candidates for insert to authenticated
  with check (user_id = auth.uid() or public.has_hr_role());
create policy candidates_update on public.candidates for update to authenticated
  using (user_id = auth.uid() or public.has_hr_role())
  with check (user_id = auth.uid() or public.has_hr_role());

-- positions: any signed-in user reads (candidates pick them); HR manages -------
create policy positions_select on public.positions for select to authenticated using (true);
create policy positions_insert on public.positions for insert to authenticated
  with check (public.has_hr_role('{SUPER_ADMIN,ADMIN,RECRUITER}'));
create policy positions_update on public.positions for update to authenticated
  using (public.has_hr_role('{SUPER_ADMIN,ADMIN,RECRUITER}'));
create policy positions_delete on public.positions for delete to authenticated
  using (public.has_hr_role('{SUPER_ADMIN,ADMIN,RECRUITER}'));

-- applications: candidate's own + HR --------------------------------------------
create policy applications_select on public.applications for select to authenticated
  using (public.has_hr_role() or exists (
    select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));
create policy applications_insert on public.applications for insert to authenticated
  with check (public.has_hr_role() or exists (
    select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));
create policy applications_update on public.applications for update to authenticated
  using (public.has_hr_role());

-- question bank: HR-only (candidates only ever see frozen snapshots) -------------
create policy questions_hr on public.questions for all to authenticated
  using (public.has_hr_role()) with check (public.has_hr_role());
create policy question_sets_hr on public.question_sets for all to authenticated
  using (public.has_hr_role()) with check (public.has_hr_role());
create policy question_set_questions_hr on public.question_set_questions for all to authenticated
  using (public.has_hr_role()) with check (public.has_hr_role());

-- interviews: owner candidate reads/progresses; HR manages -------------------------
create policy interviews_select on public.interviews for select to authenticated
  using (public.has_hr_role() or exists (
    select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));
create policy interviews_insert on public.interviews for insert to authenticated
  with check (public.has_hr_role());
create policy interviews_update on public.interviews for update to authenticated
  using (public.has_hr_role() or exists (
    select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));

create policy interview_questions_select on public.interview_questions for select to authenticated
  using (public.has_hr_role() or exists (
    select 1 from public.interviews i
    join public.candidates c on c.id = i.candidate_id
    where i.id = interview_id and c.user_id = auth.uid()));
create policy interview_questions_insert on public.interview_questions for insert to authenticated
  with check (public.has_hr_role());
create policy interview_questions_update on public.interview_questions for update to authenticated
  using (public.has_hr_role() or exists (
    select 1 from public.interviews i
    join public.candidates c on c.id = i.candidate_id
    where i.id = interview_id and c.user_id = auth.uid()));

-- recordings: private to owner + HR; no deletes through the API ---------------------
create policy recordings_select on public.recordings for select to authenticated
  using (public.has_hr_role() or candidate_id = public.current_candidate_id());
create policy recordings_insert on public.recordings for insert to authenticated
  with check (candidate_id = public.current_candidate_id());
create policy recordings_update on public.recordings for update to authenticated
  using (public.has_hr_role() or candidate_id = public.current_candidate_id());

-- evaluation config readable; mutations admin-only ------------------------------------
create policy eval_categories_select on public.evaluation_categories for select to authenticated using (true);
create policy eval_categories_manage on public.evaluation_categories for all to authenticated
  using (public.has_hr_role('{SUPER_ADMIN,ADMIN}')) with check (public.has_hr_role('{SUPER_ADMIN,ADMIN}'));

-- evaluations: HR-only (reviewers included) ---------------------------------------------
create policy evaluations_select on public.evaluations for select to authenticated
  using (public.has_hr_role());
create policy evaluations_insert on public.evaluations for insert to authenticated
  with check (public.has_hr_role());
create policy evaluations_update on public.evaluations for update to authenticated
  using (public.has_hr_role());
create policy evaluation_scores_select on public.evaluation_scores for select to authenticated
  using (public.has_hr_role());
create policy evaluation_scores_insert on public.evaluation_scores for insert to authenticated
  with check (public.has_hr_role());

-- status history: candidate can read their own trail --------------------------------------
create policy status_history_select on public.status_history for select to authenticated
  using (public.has_hr_role() or exists (
    select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));
create policy status_history_insert on public.status_history for insert to authenticated
  with check (public.has_hr_role());

-- audit logs: senior roles only; writers can only attribute themselves ----------------------
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (public.has_hr_role('{SUPER_ADMIN,ADMIN}'));
create policy audit_logs_insert on public.audit_logs for insert to authenticated
  with check (user_id = auth.uid());

-- ============================================================================
-- 5. PRIVATE STORAGE BUCKETS + POLICIES
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('candidate-cvs', 'candidate-cvs', false, 10485760,
    array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('candidate-profile-photos', 'candidate-profile-photos', false, 5242880,
    array['image/jpeg','image/png','image/webp']),
  ('interview-recordings', 'interview-recordings', false, 209715200,
    array['video/webm','video/mp4','audio/webm','audio/mpeg','audio/mp4'])
on conflict (id) do nothing;

-- Path convention: {candidate_id}/{filename} — folder 1 must be your own candidate id.
drop policy if exists cvs_read on storage.objects;
drop policy if exists cvs_write on storage.objects;
drop policy if exists photos_read on storage.objects;
drop policy if exists photos_write on storage.objects;
drop policy if exists recordings_read on storage.objects;
drop policy if exists recordings_write on storage.objects;

create policy cvs_read on storage.objects for select to authenticated
  using (bucket_id = 'candidate-cvs' and (
    public.has_hr_role() or (storage.foldername(name))[1] = public.current_candidate_id()::text));
create policy cvs_write on storage.objects for insert to authenticated
  with check (bucket_id = 'candidate-cvs' and
    (storage.foldername(name))[1] = public.current_candidate_id()::text);

create policy photos_read on storage.objects for select to authenticated
  using (bucket_id = 'candidate-profile-photos' and (
    public.has_hr_role() or (storage.foldername(name))[1] = public.current_candidate_id()::text));
create policy photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'candidate-profile-photos' and
    (storage.foldername(name))[1] = public.current_candidate_id()::text);

create policy recordings_read on storage.objects for select to authenticated
  using (bucket_id = 'interview-recordings' and (
    public.has_hr_role() or (storage.foldername(name))[1] = public.current_candidate_id()::text));
create policy recordings_write on storage.objects for insert to authenticated
  with check (bucket_id = 'interview-recordings' and
    (storage.foldername(name))[1] = public.current_candidate_id()::text);

-- ============================================================================
-- Done. Verify with:  select count(*) from information_schema.tables
--                     where table_schema = 'public';   (expected: 17)
-- ============================================================================
