-- ============================================================================
-- TalentGate — V1.2.1 GOOGLE SIGN-IN SUPPORT
--
-- Extends the existing handle_new_user() trigger to also capture avatar_url
-- from OAuth providers (Google, etc.) when a user signs in for the first time.
--
-- Google OAuth returns user metadata including:
--   - full_name (already captured)
--   - avatar_url (NEW: captured by this migration)
--
-- This migration is additive and safe to re-run.
-- ============================================================================

-- Update the trigger function to capture avatar_url from OAuth metadata
create or replace function public.handle_new_user()
returns trigger
set search_path = ''
language plpgsql
security definer as $$
begin
  insert into public.profiles (id, email, full_name, phone, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    phone = coalesce(excluded.phone, profiles.phone),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end;
$$;

-- ============================================================================
-- Verification query (run after migration):
--   select proname from pg_proc where proname = 'handle_new_user';
-- Expected: 1 row
-- ============================================================================
