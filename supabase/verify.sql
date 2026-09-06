-- ============================================================================
-- TalentGate — POST-MIGRATION VERIFICATION
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Raises an exception on the first failed check; prints a summary otherwise.
--
-- This script is safe to re-run. It only reads catalog + storage metadata.
-- ============================================================================

do $$
declare
  v_tables int;
  v_rls int;
  v_buckets int;
  v_public_buckets int;
  v_fns int;
  v_col int;
begin
  -- 1. All 17 foundation tables exist ---------------------------------------
  select count(*) into v_tables
    from information_schema.tables
   where table_schema = 'public'
     and table_name in (
       'roles','profiles','user_roles','candidates','positions','applications',
       'questions','question_sets','question_set_questions','interviews',
       'interview_questions','recordings','evaluation_categories','evaluations',
       'evaluation_scores','status_history','audit_logs');
  if v_tables <> 17 then
    raise exception 'VERIFY FAILED: expected 17 tables, found % — run 0001_foundation.sql', v_tables;
  end if;

  -- 2. Row Level Security enabled on every table -----------------------------
  select count(*) into v_rls
    from pg_tables
   where schemaname = 'public' and rowsecurity
     and tablename in (
       'roles','profiles','user_roles','candidates','positions','applications',
       'questions','question_sets','question_set_questions','interviews',
       'interview_questions','recordings','evaluation_categories','evaluations',
       'evaluation_scores','status_history','audit_logs');
  if v_rls <> 17 then
    raise exception 'VERIFY FAILED: RLS enabled on %/17 tables', v_rls;
  end if;

  -- 3. Three private buckets, none public -------------------------------------
  select count(*) into v_buckets from storage.buckets
   where id in ('candidate-cvs','candidate-profile-photos','interview-recordings');
  if v_buckets <> 3 then
    raise exception 'VERIFY FAILED: expected 3 storage buckets, found %', v_buckets;
  end if;

  select count(*) into v_public_buckets from storage.buckets
   where id in ('candidate-cvs','candidate-profile-photos','interview-recordings')
     and public = true;
  if v_public_buckets <> 0 then
    raise exception 'VERIFY FAILED: % bucket(s) are PUBLIC — recordings must stay private', v_public_buckets;
  end if;

  -- 4. Recording lifecycle functions exist (0002) ------------------------------
  select count(*) into v_fns
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in (
       'start_interview','update_interview_question_status','prepare_recording',
       'finalize_recording','fail_recording','submit_interview',
       'update_candidate_files','change_candidate_status','create_interview',
       'set_question_set_questions','submit_evaluation','has_hr_role');
  if v_fns <> 12 then
    raise exception 'VERIFY FAILED: expected 12 security-definer functions, found % — run 0002_recording_pipeline.sql', v_fns;
  end if;

  -- 5. V1.2 schema extensions ---------------------------------------------------
  select count(*) into v_col from information_schema.columns
   where table_schema = 'public' and table_name = 'recordings' and column_name = 'mime_type';
  if v_col <> 1 then
    raise exception 'VERIFY FAILED: recordings.mime_type missing — run 0002_recording_pipeline.sql';
  end if;

  select count(*) into v_col from information_schema.columns
   where table_schema = 'public' and table_name = 'interview_questions' and column_name = 'is_required';
  if v_col <> 1 then
    raise exception 'VERIFY FAILED: interview_questions.is_required missing — run 0002_recording_pipeline.sql';
  end if;

  raise notice 'VERIFY PASSED: 17 tables · RLS on 17/17 · 3 private buckets · 12 functions · V1.2 columns present';
end $$;

-- Optional manual smoke checks (run as the anon/another user's session, NOT service role):
--   select * from public.candidates;              -- must return 0 rows or be denied
--   select * from public.recordings;              -- must return 0 rows or be denied
--   select public.has_hr_role();                  -- false for plain candidates
