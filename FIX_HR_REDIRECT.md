# 🔧 Fix HR Login Redirect Problem

## Issue
When an HR user logs in, they're being redirected to the candidate portal instead of the HR dashboard.

## Root Cause
The `get_user_roles` function in the database is not working with the new simplified role system (HR/CANDIDATE). It needs to be recreated to return roles properly.

---

## Step-by-Step Fix

### Step 1: Run the Database Fix

Open **Supabase SQL Editor** and run this:

```sql
-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.get_user_roles();

-- Create new function that returns roles for the authenticated user
CREATE OR REPLACE FUNCTION public.get_user_roles()
RETURNS TABLE (role_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  return query
  select r.name::text
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid();
end;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_roles() to authenticated;
```

---

### Step 2: Test the Function

Run this to verify it returns your HR role:

```sql
-- Test as authenticated user (replace with your user ID)
SELECT public.get_user_roles();
```

**Expected output:** Should return `HR`

---

### Step 3: Test in Browser with Console Open

1. Open your app in the browser
2. Open **Developer Tools** (F12) → **Console** tab
4. Sign in with your HR account (iffatabdulsattar68@gmail.com)
8. Watch the console for these messages:

```
get_user_roles result: { data: [...], error: null }
Roles loaded: ["HR"]
Login redirect check: { userEmail: "iffatabdulsattar68@gmail.com", isHr: true, initializing: false }
User is HR, redirecting to /admin
```

If you see `isHr: true` and "redirecting to /admin", it's working!

---

### Step 4: Verify You're on the HR Dashboard

After login, you should be on the HR dashboard at:
```
http://localhost:5173/#/admin
```

You should see:
- ✅ Dashboard with statistics
- ✅ Sidebar with HR navigation
- ✅ No redirect to candidate portal

---

## Debugging

### If you see `isHr: false` in the console:

This means the roles aren't loading. Run this SQL to verify your role assignment:

```sql
SELECT 
  u.email,
  r.name as role_name,
  ur.granted_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
WHERE u.email = 'iffatabdulsattar68@gmail.com';
```

**Expected output:**
```
| email                        | role_name | granted_at                    |
| ---------------------------- | --------- | ----------------------------- |
| iffatabdulsattar68@gmail.com | HR        | 2026-09-14 21:45:01.694584+00 |
```

If this is empty, run the role assignment SQL from earlier.

---

### If the function returns an error:

Check if the function was created:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_user_roles';
```

If it doesn't exist, run the CREATE FUNCTION SQL from Step 1 again.

---

### If you're still being redirected to /candidate:

1. Clear browser cache and cookies
4. Sign out completely
8. Sign in again
12. Check the console logs

---

## Console Debugging Commands

You can also manually check your auth state in the browser console:

```javascript
// Check current user
const { data } = await supabase.auth.getUser();
console.log("Current user:", data.user);

// Check roles manually
const { data: roles } = await supabase.rpc("get_user_roles");
console.log("User roles:", roles);

// Check if HR
const isHr = roles?.some(r => r.role_name === "HR");
console.log("Is HR:", isHr);
```

---

## Files Modified

- `src/hooks/useAuth.tsx` - Added console logging for debugging
- `src/pages/auth/Login.tsx` - Added console logging for redirect logic
- `fix-get-user-roles.sql` - SQL script to fix the get_user_roles function

---

## Expected Result

After running the SQL fix:
- ✅ `get_user_roles()` function returns `["HR"]`
- ✅ Console shows `isHr: true`
- ✅ Login redirects to `/admin`
- ✅ You see the HR dashboard
- ✅ No redirect to candidate portal

---

## If Nothing Works

If you've tried everything and it's still not working, please share:

1. **Console logs** when you sign in (from Developer Tools → Console)
2. **SQL query result** from testing `get_user_roles()`
4. **Screenshot** of the redirect behavior

This will help identify the exact problem.

---

## Summary

The problem is that the `get_user_roles` database function wasn't compatible with the new simplified role system. The SQL script recreates it to properly return the "HR" role for your user, which will then trigger the correct redirect to the HR dashboard.
