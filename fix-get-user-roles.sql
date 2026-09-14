-- ============================================================================
-- Fix get_user_roles function for simplified role system
-- Run this in Supabase SQL Editor
-- ============================================================================

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

-- ============================================================================
-- Test the function
-- ============================================================================
SELECT public.get_user_roles();

-- This should return 'HR' for your user account
-- ============================================================================
