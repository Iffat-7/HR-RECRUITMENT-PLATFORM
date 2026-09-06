-- ============================================================================
-- TalentGate — V1.2 RECORDING PIPELINE MIGRATION
-- Builds on 0001_foundation.sql (does NOT modify it destructively).
--
-- Run this file in: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Contents:
--   1. Schema extensions (recordings.mime_type, interview_questions.is_required,
--      widened status domains incl. COMPLETED / FAILED / SUPERSEDED)
--   2. Recording lifecycle functions (SECURITY DEFINER, ownership-enforced):
--        start_interview / update_interview_question_status
--        prepare_recording -> finalize_recording / fail_recording
--        submit_interview / update_candidate_files
--   3. Grants (authenticated only)
--
-- Storage paths keep the V1.1 convention that the existing RLS storage
-- policies already enforce — folder 1 = candidate_id:
--   candidate-cvs:            {candidate_id}/cv/{uuid}.{ext}
--   candidate-profile-photos: {candidate_id}/profile/{uuid}.{ext}
--   interview-recordings:     {candidate_id}/interviews/{interview_id}/{question_id}/{uuid}.{ext}
-- Paths for recordings are generated SERVER-SIDE in prepare_recording(), so a
-- tampered client can never choose where a file lands.
-- ============================================================================

-- ============================================================================
-- 1. SCHEMA EXTENSIONS
-- ============================================================================

alter table public.recordings add column if not exists mime_type text;

-- widen recordings status domain (adds SUPERSEDED — retaken answers stay auditable)
alter table public.recordings drop constraint if exists recordings_status_check;
alter table public.recordings add constraint recordings_status_check
  check (status in ('UPLOADING','UPLOADED','PROCESSING','TRANSCRIBED','FAILED','DELETED','SUPERSEDED'));

-- widen interview_questions status domain for the live recorder lifecycle
alter table public.interview_questions drop constraint if exists interview_questions_status_check;
alter table public.interview_questions add constraint interview_questions_status_check
  check (status in ('PENDING','PREPARING','RECORDING','REVIEWING','UPLOADING','COMPLETED','FAILED','RECORDED','SKIPPED'));

-- freeze the question's required-ness into the snapshot (backfilled from the bank)
alter table public.interview_questions add column if not exists is_required boolean not null default true;
update public.interview_questions iq
   set is_required = q.is_required
  from public.questions q
 where iq.question_id = q.id;

create index if not exists idx_interview_questions_status
  on public.interview_questions (interview_id, status);

-- ============================================================================
-- 2. RECORDING LIFECYCLE FUNCTIONS
-- ============================================================================

-- Candidate starts their interview. Idempotent for resume-after-refresh.
-- Requires the CV upload (server-side gate, not a UI suggestion).
create or replace function public.start_interview(p_interview_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ctx record;
  v_old_cand text;
begin
  select i.candidate_id, i.status, i.application_id, c.user_id as owner, c.cv_path
    into v_ctx
    from public.interviews i
    join public.candidates c on c.id = i.candidate_id
   where i.id = p_interview_id
     for update of i;

  if not found then
    raise exception 'Interview not found';
  end if;
  if v_ctx.owner is distinct from auth.uid() then
    raise exception 'This interview belongs to another candidate';
  end if;
  if v_ctx.status = 'IN_PROGRESS' then
    return; -- resuming
  end if;
  if v_ctx.status is distinct from 'NOT_STARTED' then
    raise exception 'This interview can no longer be started';
  end if;
  if v_ctx.cv_path is null then
    raise exception 'Upload your CV before starting the interview';
  end if;

  update public.interviews set status = 'IN_PROGRESS', started_at = now()
   where id = p_interview_id;

  if v_ctx.application_id is not null then
    update public.applications set status = 'INTERVIEW_IN_PROGRESS'
     where id = v_ctx.application_id;
  end if;

  select status into v_old_cand from public.candidates where id = v_ctx.candidate_id;
  if v_old_cand is distinct from 'INTERVIEW' then
    update public.candidates set status = 'INTERVIEW' where id = v_ctx.candidate_id;
    insert into public.status_history (candidate_id, old_status, new_status, changed_by, reason)
    values (v_ctx.candidate_id, v_old_cand, 'INTERVIEW', auth.uid(), 'Candidate started the recorded interview');
  end if;

  perform public.log_audit('interview.started', 'interview', p_interview_id,
    jsonb_build_object('candidate_id', v_ctx.candidate_id));
end $$;

-- Candidate-side lifecycle ticks (PREPARING/RECORDING/REVIEWING/UPLOADING/FAILED).
-- COMPLETED can ONLY be set by finalize_recording — never by the client.
create or replace function public.update_interview_question_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ctx record;
begin
  if p_status not in ('PENDING','PREPARING','RECORDING','REVIEWING','UPLOADING','FAILED','SKIPPED') then
    raise exception 'Invalid question status';
  end if;

  select i.status as interview_status, c.user_id as owner, iq.is_required,
         iq.status as question_status
    into v_ctx
    from public.interview_questions iq
    join public.interviews i on i.id = iq.interview_id
    join public.candidates c on c.id = i.candidate_id
   where iq.id = p_id;

  if not found then raise exception 'Question not found'; end if;
  if v_ctx.owner is distinct from auth.uid() then raise exception 'Not your interview question'; end if;
  if v_ctx.interview_status is distinct from 'IN_PROGRESS' then
    raise exception 'Interview is not in progress';
  end if;
  -- Final answers are locked: a tampered client cannot revert COMPLETED/SKIPPED.
  if v_ctx.question_status in ('COMPLETED','SKIPPED') then
    raise exception 'This question is final and can no longer change state';
  end if;
  if p_status = 'SKIPPED' and v_ctx.is_required then
    raise exception 'Required questions cannot be skipped';
  end if;

  update public.interview_questions set status = p_status where id = p_id;
end $$;

-- Two-phase upload, step 1: validate everything, mint a server-generated
-- storage path, insert the recording row as UPLOADING. Returns (id, path).
create or replace function public.prepare_recording(
  p_interview_question_id uuid,
  p_file_type text,
  p_mime_type text,
  p_duration_seconds numeric
) returns table (id uuid, storage_path text)
language plpgsql security definer set search_path = public as $$
declare
  v_ctx record;
  v_attempts int;
  v_next int;
  v_ext text;
  v_path text;
  v_rec uuid;
begin
  if p_file_type not in ('VIDEO','AUDIO') then
    raise exception 'Invalid file type';
  end if;
  if lower(p_mime_type) not in ('video/webm','audio/webm','video/mp4','audio/mp4') then
    raise exception 'Unsupported recording format';
  end if;

  select iq.maximum_retakes, iq.maximum_duration_seconds, iq.status as question_status,
         i.id as interview_id, i.status as interview_status,
         c.id as candidate_id, c.user_id as owner
    into v_ctx
    from public.interview_questions iq
    join public.interviews i on i.id = iq.interview_id
    join public.candidates c on c.id = i.candidate_id
   where iq.id = p_interview_question_id;

  if not found then raise exception 'Question not found'; end if;
  if v_ctx.owner is distinct from auth.uid() then raise exception 'Not your interview question'; end if;
  if v_ctx.interview_status is distinct from 'IN_PROGRESS' then
    raise exception 'Interview is not in progress';
  end if;
  -- Retakes happen BEFORE an answer becomes final; once COMPLETED it is locked.
  if v_ctx.question_status = 'COMPLETED' then
    raise exception 'This question already has a final answer';
  end if;

  if p_duration_seconds is null or p_duration_seconds < 1
     or p_duration_seconds > v_ctx.maximum_duration_seconds + 2 then
    raise exception 'Recording duration is outside the allowed limits';
  end if;

  -- Attempts = successful takes only (UPLOADED + superseded history);
  -- failed/interrupted uploads never consume an attempt.
  select count(*) into v_attempts
    from public.recordings r
   where r.interview_question_id = p_interview_question_id
     and r.status in ('UPLOADED','SUPERSEDED','PROCESSING','TRANSCRIBED');

  v_next := v_attempts + 1;
  if v_next > v_ctx.maximum_retakes + 1 then
    raise exception 'Maximum number of attempts reached for this question';
  end if;

  v_ext := case when lower(p_mime_type) like '%/mp4' then 'mp4' else 'webm' end;
  v_path := v_ctx.candidate_id::text || '/interviews/' || v_ctx.interview_id::text || '/'
         || p_interview_question_id::text || '/' || gen_random_uuid()::text || '.' || v_ext;

  insert into public.recordings
    (interview_question_id, candidate_id, storage_path, file_type, mime_type,
     duration_seconds, attempt_number, status)
  values
    (p_interview_question_id, v_ctx.candidate_id, v_path, p_file_type, lower(p_mime_type),
     p_duration_seconds, v_next, 'UPLOADING')
  returning recordings.id into v_rec;

  perform public.log_audit('recording.prepared', 'recording', v_rec,
    jsonb_build_object('attempt', v_next, 'file_type', p_file_type, 'mime', lower(p_mime_type)));

  return query select v_rec, v_path;
end $$;

-- Two-phase upload, step 2: file is in the bucket; flip the row to UPLOADED,
-- supersede the previous take (kept for auditability), mark question COMPLETED.
create or replace function public.finalize_recording(p_recording_id uuid, p_file_size bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ctx record;
begin
  if p_file_size is null or p_file_size <= 0 or p_file_size > 209715200 then
    raise exception 'Invalid file size';
  end if;

  select r.status, r.interview_question_id, c.user_id as owner, i.status as interview_status
    into v_ctx
    from public.recordings r
    join public.candidates c on c.id = r.candidate_id
    join public.interview_questions iq on iq.id = r.interview_question_id
    join public.interviews i on i.id = iq.interview_id
   where r.id = p_recording_id
     for update of r;

  if not found then raise exception 'Recording not found'; end if;
  if v_ctx.owner is distinct from auth.uid() then raise exception 'Not your recording'; end if;
  if v_ctx.status is distinct from 'UPLOADING' then
    raise exception 'Recording was already finalized or failed';
  end if;
  -- Late uploads cannot mutate an interview that was already submitted/locked.
  if v_ctx.interview_status is distinct from 'IN_PROGRESS' then
    raise exception 'The interview is no longer in progress';
  end if;

  update public.recordings set status = 'SUPERSEDED'
   where interview_question_id = v_ctx.interview_question_id
     and id <> p_recording_id
     and status = 'UPLOADED';

  update public.recordings
     set status = 'UPLOADED', file_size = p_file_size, uploaded_at = now()
   where id = p_recording_id;

  update public.interview_questions set status = 'COMPLETED'
   where id = v_ctx.interview_question_id;

  perform public.log_audit('recording.uploaded', 'recording', p_recording_id,
    jsonb_build_object('bytes', p_file_size));
end $$;

-- Mark an interrupted/failed upload. Does NOT consume an attempt.
create or replace function public.fail_recording(p_recording_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ctx record;
begin
  select r.status, c.user_id as owner
    into v_ctx
    from public.recordings r
    join public.candidates c on c.id = r.candidate_id
   where r.id = p_recording_id
     for update of r;

  if not found then return; -- nothing to clean up
  end if;
  if v_ctx.owner is distinct from auth.uid() then raise exception 'Not your recording'; end if;
  if v_ctx.status is distinct from 'UPLOADING' then return; end if;

  update public.recordings set status = 'FAILED' where id = p_recording_id;
end $$;

-- Final submission: only when every required question is COMPLETED.
create or replace function public.submit_interview(p_interview_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ctx record;
  v_missing int;
  v_old text;
begin
  select i.candidate_id, i.application_id, i.status, c.user_id as owner
    into v_ctx
    from public.interviews i
    join public.candidates c on c.id = i.candidate_id
   where i.id = p_interview_id
     for update of i;

  if not found then raise exception 'Interview not found'; end if;
  if v_ctx.owner is distinct from auth.uid() then raise exception 'Not your interview'; end if;
  if v_ctx.status is distinct from 'IN_PROGRESS' then
    raise exception 'This interview cannot be submitted in its current state';
  end if;

  select count(*) into v_missing
    from public.interview_questions
   where interview_id = p_interview_id
     and is_required
     and status is distinct from 'COMPLETED';

  if v_missing > 0 then
    raise exception 'Required answers are still missing';
  end if;

  update public.interviews
     set status = 'SUBMITTED', completed_at = now(), submitted_at = now()
   where id = p_interview_id;

  if v_ctx.application_id is not null then
    update public.applications set status = 'INTERVIEW_SUBMITTED'
     where id = v_ctx.application_id;
  end if;

  select status into v_old from public.candidates where id = v_ctx.candidate_id;
  if v_old is distinct from 'UNDER_REVIEW' then
    update public.candidates set status = 'UNDER_REVIEW' where id = v_ctx.candidate_id;
    insert into public.status_history (candidate_id, old_status, new_status, changed_by, reason)
    values (v_ctx.candidate_id, v_old, 'UNDER_REVIEW', auth.uid(), 'Candidate submitted the recorded interview');
  end if;

  perform public.log_audit('interview.submitted', 'interview', p_interview_id, '{}'::jsonb);
end $$;

-- Candidates may only update their own file pointers — nothing else.
create or replace function public.update_candidate_files(
  p_cv_path text default null,
  p_profile_photo_path text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  select id into v_id from public.candidates where user_id = auth.uid() for update;
  if not found then raise exception 'Candidate profile not found'; end if;

  update public.candidates
     set cv_path = coalesce(p_cv_path, cv_path),
         profile_photo_path = coalesce(p_profile_photo_path, profile_photo_path)
   where id = v_id;

  perform public.log_audit('candidate.files_updated', 'candidate', v_id,
    jsonb_build_object('cv', p_cv_path is not null, 'photo', p_profile_photo_path is not null));
end $$;

-- ============================================================================
-- 3. GRANTS — least privilege, mirroring V1.1
-- ============================================================================

revoke execute on function public.start_interview(uuid) from public, anon;
revoke execute on function public.update_interview_question_status(uuid, text) from public, anon;
revoke execute on function public.prepare_recording(uuid, text, text, numeric) from public, anon;
revoke execute on function public.finalize_recording(uuid, bigint) from public, anon;
revoke execute on function public.fail_recording(uuid) from public, anon;
revoke execute on function public.submit_interview(uuid) from public, anon;
revoke execute on function public.update_candidate_files(text, text) from public, anon;

grant execute on function public.start_interview(uuid) to authenticated;
grant execute on function public.update_interview_question_status(uuid, text) to authenticated;
grant execute on function public.prepare_recording(uuid, text, text, numeric) to authenticated;
grant execute on function public.finalize_recording(uuid, bigint) to authenticated;
grant execute on function public.fail_recording(uuid) to authenticated;
grant execute on function public.submit_interview(uuid) to authenticated;
grant execute on function public.update_candidate_files(text, text) to authenticated;

-- ============================================================================
-- Verification (run supabase/verify.sql afterwards):
--   * 17 tables, RLS on all of them
--   * 3 private buckets with owner-scoped policies from 0001
--   * recordings.mime_type + widened status domains present
-- ============================================================================
