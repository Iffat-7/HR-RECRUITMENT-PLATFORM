# Supabase Verification Guide

## Quick Verification Steps

Since you've already run the migrations and set up Google Sign-In, follow these steps to verify everything is working correctly:

### Step 1: Run the Verification Script

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/khaxdoosuzzanardcnjx/sql/new
2. Open the file `verify-database.sql` from this project
3. Copy all the SQL code
4. Paste it into the Supabase SQL Editor
5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)

### Step 2: Check the Results

Look for these key indicators:

#### ✅ Roles Check
Should show exactly **2 roles**:
- `CANDIDATE`
- `HR`

If you see 4 roles (SUPER_ADMIN, ADMIN, RECRUITER, REVIEWER), the 0004 migration didn't run properly.

#### ✅ Storage Buckets Check
Should show **3 buckets**:
- `candidate-cvs` (public = false)
- `candidate-profile-photos` (public = false)
- `interview-recordings` (public = false)

All buckets should have `public = false` (private).

#### ✅ RLS Check
All tables should show `rls_enabled = true`

#### ✅ Summary Counts
The final summary should show:
- `roles_count`: 2
- `storage_status`: ✅ Storage: OK (3 buckets)
- `rls_status`: ✅ RLS: OK (enabled on all tables)

### Step 3: Test Google Sign-In

1. Go to your app's login page
2. Click "Continue with Google"
3. Sign in with a Google account
4. You should be redirected to the candidate portal

### Step 4: Create an HR User

If you haven't already created an HR user:

```sql
-- Replace with your actual email
INSERT INTO user_roles (user_id, role_id)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  (SELECT id FROM roles WHERE name = 'HR');
```

### Step 5: Test the Application

1. **As HR**: Sign in and verify you can access the admin dashboard
2. **As Candidate**: Register a new candidate and verify they can:
   - Upload CV
   - Upload profile photo
   - Start an interview
   - Record video/audio answers
   - Submit the interview

## Common Issues

### Issue: "Roles check shows 4 roles instead of 2"
**Solution**: Run the 0004 migration again:
```sql
-- Run: supabase/migrations/0004_simplified_roles.sql
```

### Issue: "Storage buckets are missing"
**Solution**: The buckets should have been created by migration 0001. Check if you ran it successfully. If not, you may need to manually create them in the Supabase Storage section.

### Issue: "RLS not enabled on some tables"
**Solution**: This is a critical security issue. Check migration 0001 to ensure all RLS policies were created.

### Issue: "Google Sign-In not working"
**Solution**: 
1. Check that you've configured Google OAuth in Supabase Dashboard → Authentication → Providers → Google
2. Verify the redirect URL is correct: `https://khaxdoosuzzanardcnjx.supabase.co/auth/v1/callback`
3. Check that you've run migration 0003 (Google Sign-In support)

### Issue: "Can't sign in as HR after creating user"
**Solution**: 
1. Verify the user exists in `auth.users`
2. Verify the role assignment exists in `user_roles`
3. Check that the role is 'HR' (not 'SUPER_ADMIN' or any other role)

## Next Steps

Once verification passes:
1. Create some test positions
2. Create some interview questions
3. Create a question set
4. Test the full candidate flow
5. Test HR evaluation flow

## Need Help?

If verification fails or you encounter issues:
1. Check the error messages in the SQL results
2. Review the migration files to ensure they ran correctly
3. Check the Supabase logs for any errors
4. Refer to ROLE_SIMPLIFICATION.md for role-related issues
