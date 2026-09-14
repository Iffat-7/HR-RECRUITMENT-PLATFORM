-- ============================================================================
-- Quick HR Role Assignment Script
-- Run this in Supabase SQL Editor to assign yourself the HR role
-- ============================================================================

-- Step 1: Find your user ID
SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Copy your User ID from the results above, then run this:
-- (Replace 'YOUR_USER_ID_HERE' with your actual user ID)

/*
INSERT INTO user_roles (user_id, role_id, granted_by)
VALUES (
  'YOUR_USER_ID_HERE',  -- ← Replace with your user ID from Step 1
  (SELECT id FROM roles WHERE name = 'HR'),
  'YOUR_USER_ID_HERE'   -- ← Same user ID (you're granting it to yourself)
);
*/

-- Step 3: Verify the role was assigned
SELECT 
  u.email,
  r.name as role_name,
  ur.granted_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
ORDER BY ur.granted_at DESC;

-- ============================================================================
-- After running this, refresh the app and sign in again.
-- You should now be redirected to the HR dashboard instead of candidate portal.
-- ============================================================================
