# Simplified Role System - Migration Summary

## Overview

The role system has been simplified from 4 roles to 2 roles to match your actual business needs:

### Before (4 roles - over-engineered):
- **SUPER_ADMIN** - Full platform control
- **ADMIN** - Manage positions, questions, candidates
- **RECRUITER** - Run the pipeline
- **REVIEWER** - Review recordings and evaluate

### After (2 roles - simplified):
- **HR** - The recruiter who manages everything (candidates, positions, evaluations)
- **CANDIDATE** - The job seeker (assigned automatically when they register)

---

## What Changed

### 1. Database Migration
**File:** `supabase/migrations/0004_simplified_roles.sql`

This migration:
- Clears the old 4 roles from the `roles` table
- Creates 2 new roles: `HR` and `CANDIDATE`
- Migrates any existing users with SUPER_ADMIN/ADMIN/RECRUITER/REVIEWER roles to the new `HR` role
- Updates the `has_hr_role()` function to check for the simplified `HR` role
- Safe to run multiple times (idempotent)

### 2. Frontend Changes

#### Type Definitions (`src/types/index.ts`)
- Updated `RoleName` type from `"SUPER_ADMIN" | "ADMIN" | "RECRUITER" | "REVIEWER"` to `"HR" | "CANDIDATE"`
- Updated `STATUS_TONES` mapping for the new roles

#### Authentication Hook (`src/hooks/useAuth.tsx`)
- Updated `HR_ROLES` array from `["SUPER_ADMIN", "ADMIN", "RECRUITER", "REVIEWER"]` to `["HR"]`
- The `isHr` boolean now checks for the simplified `HR` role

#### UI Components
- **Login page** (`src/pages/auth/Login.tsx`): Updated description text
- **Audit Logs** (`src/pages/admin/AuditLogs.tsx`): Updated visibility description
- **Users page** (`src/pages/admin/Users.tsx`): Updated empty state message
- **Shared components** (`src/components/shared.tsx`): Updated `ROLE_TONES` mapping

#### Services
- **Admin service** (`src/services/admin.ts`): Updated comment about RLS permissions

### 3. Documentation Updates

#### SUPABASE_DEPLOYMENT.md
- Updated "Create your first HR user" section (was "SUPER_ADMIN")
- Changed SQL query to use `r.name = 'HR'` instead of `r.name = 'SUPER_ADMIN'`
- Updated verification query comment from "expected: 4" to "expected: 2" roles
- Added note explaining the 2-role system

#### README.md
- Updated step 4 to create "HR" user instead of "SUPER_ADMIN"
- Updated SQL query to use `r.name = 'HR'`

#### V1.2_SMOKE_TEST.md
- Updated prerequisite checklist to reference `HR` role instead of `SUPER_ADMIN`

---

## Deployment Steps

### If you haven't run any migrations yet:

1. Run `0001_foundation.sql` (creates the original 4 roles)
2. Run `0002_recording_pipeline.sql` (recording features)
3. Run `0003_google_signin.sql` (Google OAuth support)
4. **Run `0004_simplified_roles.sql`** (simplifies to 2 roles)
5. Run `verify.sql` (should show "expected: 2" roles)

### If you've already run migrations 0001-0003:

Just run `0004_simplified_roles.sql` to migrate from 4 roles to 2 roles.

---

## How to Assign Roles

### For HR users:
```sql
insert into public.user_roles (user_id, role_id, granted_by)
select u.id, r.id, u.id
  from auth.users u, public.roles r
 where u.email = 'hr@yourcompany.com'
   and r.name = 'HR';
```

### For Candidates:
Candidates are assigned the `CANDIDATE` role **automatically** when they register through the candidate portal. You don't need to manually assign this role.

---

## Verification

After running the migration, verify with:

```sql
-- Should return 2 rows: HR and CANDIDATE
select name from public.roles order by name;

-- Should return the count of HR users you have
select count(*) from public.user_roles ur
join public.roles r on r.id = ur.role_id
where r.name = 'HR';
```

---

## Why This Change?

Your business only has two types of users:
1. **HR Recruiters** - who manage the entire recruitment process
2. **Candidates** - who apply for jobs and take interviews

The 4-role system (SUPER_ADMIN, ADMIN, RECRUITER, REVIEWER) was over-engineered for your needs. The simplified 2-role system is:
- **Easier to understand** - just HR and Candidate
- **Easier to manage** - no need to figure out which of 4 roles to assign
- **Matches your workflow** - HR does everything, candidates just apply

---

## Backward Compatibility

The migration is **safe and idempotent**:
- If you run it on a fresh database, it creates the 2 roles
- If you run it on a database with the old 4 roles, it migrates existing users to HR
- If you run it again, nothing changes (it's safe to re-run)

All existing RLS policies continue to work because they use the `has_hr_role()` function, which was updated to check for the new `HR` role.

---

## Testing

After deployment:
1. Create an HR user and assign the `HR` role
2. Sign in as HR - you should see the admin console
3. Create a candidate account - they should automatically get the `CANDIDATE` role
4. Sign in as candidate - you should see the candidate portal

Both roles should work correctly with all existing features (recordings, evaluations, etc.).
