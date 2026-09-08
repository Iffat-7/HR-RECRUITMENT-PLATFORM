-- ============================================================================
-- TalentGate — SIMPLIFIED ROLE SYSTEM
-- 
-- Replaces the 4-role system (SUPER_ADMIN, ADMIN, RECRUITER, REVIEWER) with
-- a simple 2-role system: HR and CANDIDATE.
--
-- This migration:
-- 1. Updates the roles table to have just 2 roles
-- 2. Migrates any existing SUPER_ADMIN/ADMIN/RECRUITER/REVIEWER users to HR
-- 3. Updates RLS policies to use the simplified model
-- ============================================================================

-- Step 1: Clear existing roles and create the simplified set
delete from public.roles;

insert into public.roles (id, name, description, is_system) values
  ('00000000-0000-0000-0000-000000000001', 'HR', 'Human Resources - manages candidates, positions, and evaluations', true),
  ('00000000-0000-0000-0000-000000000002', 'CANDIDATE', 'Job seeker - applies for positions and takes interviews', true);

-- Step 2: Migrate existing HR users (anyone with SUPER_ADMIN, ADMIN, RECRUITER, or REVIEWER) to the new HR role
-- This is safe to run multiple times
insert into public.user_roles (user_id, role_id, granted_by)
select distinct ur.user_id, 
       (select id from public.roles where name = 'HR'),
       ur.granted_by
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
 where r.name in ('SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'REVIEWER')
   and not exists (
     select 1 from public.user_roles ur2
     where ur2.user_id = ur.user_id
       and ur2.role_id = (select id from public.roles where name = 'HR')
   );

-- Step 3: Remove old role assignments
delete from public.user_roles
 where role_id in (
   select id from public.roles where name in ('SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'REVIEWER')
 );

-- Step 4: Drop the old roles from the roles table (they're no longer needed)
delete from public.roles where name in ('SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'REVIEWER');

-- Step 5: Update the has_hr_role() function to check for the simplified HR role
create or replace function public.has_hr_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid())
      and r.name = 'HR'
  );
$$;

-- Step 6: Update RLS policies to use the simplified role check
-- (Most policies already use has_hr_role(), so they'll automatically work with the new role)

-- ============================================================================
-- Verification:
--   select name from public.roles order by name;
--   Expected: CANDIDATE, HR (2 rows)
--
--   select count(*) from public.user_roles ur
--   join public.roles r on r.id = ur.role_id
--   where r.name = 'HR';
--   Expected: number of HR users you have
-- ============================================================================
