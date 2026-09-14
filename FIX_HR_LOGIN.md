# 🔐 Fix: HR Login Redirecting to Candidate Portal

## The Issue

When you log in to the HR recruitment page, you're being redirected to the candidate portal instead of the HR dashboard.

**Why this happens:**
- Your user account exists in Supabase Auth ✅
- But your account doesn't have the "HR" role assigned in the database ❌
- The login page checks your roles and redirects you based on what it finds
- No HR role = redirect to candidate portal

## The Solution

You need to assign yourself the HR role in the database. This is a one-time setup.

---

## Quick Fix (2 Minutes)

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**

### Step 2: Find Your User ID

Paste this SQL and click **Run**:

```sql
SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

You'll see a list of users. Find your email and copy the **id** (it's a UUID like `123e4567-e89b-12d3-a456-426614174000`).

### Step 3: Assign HR Role

Paste this SQL (replace `YOUR_USER_ID_HERE` with your actual user ID):

```sql
INSERT INTO user_roles (user_id, role_id, granted_by)
VALUES (
  'YOUR_USER_ID_HERE',  -- ← Replace with your user ID
  (SELECT id FROM roles WHERE name = 'HR'),
  'YOUR_USER_ID_HERE'   -- ← Same user ID
);
```

**Example:**
If your user ID is `abc123-def456-ghi789`, the SQL would be:

```sql
INSERT INTO user_roles (user_id, role_id, granted_by)
VALUES (
  'abc123-def456-ghi789',
  (SELECT id FROM roles WHERE name = 'HR'),
  'abc123-def456-ghi789'
);
```

Click **Run**.

### Step 4: Verify

Run this to confirm the role was assigned:

```sql
SELECT 
  u.email,
  r.name as role_name,
  ur.granted_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
JOIN roles r ON r.id = ur.role_id;
```

You should see your email with the "HR" role.

### Step 5: Refresh the App

1. Go back to your app
2. Sign out if you're logged in
3. Sign in again
4. You should now be redirected to the HR dashboard! ✅

---

## Alternative: Use the Helper Script

I've created a helper script at `assign-hr-role.sql` in your project. You can:

1. Open it in your code editor
2. Copy the SQL
3. Paste it into Supabase SQL Editor
4. Follow the instructions in the comments

---

## What Changed in the Code

I've also improved the login page to show a helpful message when this happens:

- ✅ Shows your email address
- ✅ Explains that you need the HR role
- ✅ Provides step-by-step instructions
- ✅ Gives you the exact SQL to run
- ✅ Offers buttons to sign out or go to candidate portal

This way, next time you (or anyone else) encounters this, you'll see clear instructions instead of being confused by the redirect.

---

## Why This Happens

The system has two roles:
1. **HR** - Can access the admin dashboard, manage candidates, view recordings
2. **CANDIDATE** - Can register, upload documents, take interviews

When you create a user in Supabase Auth, they don't automatically get any role. You need to explicitly assign the HR role to users who should have HR access.

This is a security feature - it prevents anyone who signs up from automatically getting admin access.

---

## For Production

In a production environment, you would:

1. **Have an initial admin setup process** - The first user gets HR role manually
2. **Use an admin panel** - HR users can assign roles to other users
3. **Use invitations** - Send invitation emails with pre-assigned roles
4. **Use groups** - Manage roles through Supabase Auth groups

For now, the manual SQL approach works perfectly for getting started.

---

## Troubleshooting

### "I ran the SQL but still getting redirected"

1. **Sign out completely** - Click sign out, then close the browser tab
2. **Clear browser cache** - Or try incognito/private mode
3. **Check the role was assigned** - Run the verification SQL from Step 4
4. **Check the role name** - Make sure it's exactly "HR" (case-sensitive)

### "I don't see any users in auth.users"

This means you haven't created any users yet. You need to:
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter your email and password
4. Then run the role assignment SQL

### "The SQL says 'role not found'"

This means the roles table doesn't have the "HR" role. Run the migrations:
1. Go to SQL Editor
2. Run `supabase/migrations/0004_simplified_roles.sql`
3. Then try the role assignment again

---

## Need Help?

If you're still stuck:

1. Check the Supabase Dashboard → Authentication → Users to see your user ID
2. Check the `user_roles` table to see if the role was assigned
3. Check the browser console (F12) for any error messages
4. Review the GETTING_STARTED.md guide for the complete setup process

---

## Summary

**Problem:** HR login redirects to candidate portal  
**Cause:** No HR role assigned to your user account  
**Solution:** Run the SQL to assign the HR role  
**Time:** 2 minutes  
**Difficulty:** Easy  

After assigning the role, you'll have full access to the HR dashboard! 🎉
