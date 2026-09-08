-- ============================================================================
-- SUPABASE VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify your setup
-- ============================================================================

-- 1. Check if all required tables exist
SELECT '📋 Tables Check' as section;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'roles', 'profiles', 'user_roles', 'candidates', 'positions', 
  'applications', 'questions', 'question_sets', 'question_set_questions',
  'interviews', 'interview_questions', 'recordings', 'evaluations',
  'evaluation_scores', 'evaluation_categories', 'status_history', 'audit_logs'
)
ORDER BY table_name;

-- 2. Check roles (should be HR and CANDIDATE only)
SELECT '👥 Roles Check' as section;

SELECT name, description 
FROM roles 
ORDER BY name;

-- Expected: 2 rows - CANDIDATE and HR

-- 3. Check if user_roles table has any assignments
SELECT '🔗 User Roles Check' as section;

SELECT 
  ur.id,
  p.email,
  r.name as role_name,
  ur.created_at
FROM user_roles ur
LEFT JOIN profiles p ON p.id = ur.user_id
LEFT JOIN roles r ON r.id = ur.role_id
ORDER BY ur.created_at DESC;

-- 4. Check candidates table
SELECT '👤 Candidates Check' as section;

SELECT 
  id,
  reference_code,
  full_name,
  email,
  status,
  created_at
FROM candidates
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check positions table
SELECT '💼 Positions Check' as section;

SELECT 
  id,
  title,
  department,
  is_active,
  created_at
FROM positions
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check questions table
SELECT '❓ Questions Check' as section;

SELECT 
  id,
  question_text,
  category,
  response_type,
  is_active
FROM questions
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check question_sets table
SELECT '📦 Question Sets Check' as section;

SELECT 
  id,
  name,
  position_id,
  is_active,
  created_at
FROM question_sets
ORDER BY created_at DESC
LIMIT 5;

-- 8. Check interviews table
SELECT '🎥 Interviews Check' as section;

SELECT 
  id,
  candidate_id,
  status,
  started_at,
  completed_at,
  created_at
FROM interviews
ORDER BY created_at DESC
LIMIT 5;

-- 9. Check recordings table (V1.2 feature)
SELECT '🎬 Recordings Check' as section;

SELECT 
  id,
  interview_question_id,
  storage_path,
  file_type,
  mime_type,
  file_size,
  duration_seconds,
  attempt_number,
  status,
  created_at
FROM recordings
ORDER BY created_at DESC
LIMIT 5;

-- 10. Check evaluations table
SELECT '⭐ Evaluations Check' as section;

SELECT 
  id,
  candidate_id,
  interview_id,
  overall_score,
  recommendation,
  created_at
FROM evaluations
ORDER BY created_at DESC
LIMIT 5;

-- 11. Check storage buckets (this will show bucket names)
SELECT '🗄️ Storage Buckets Check' as section;

SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
ORDER BY name;

-- Expected: 3 buckets - candidate-cvs, candidate-profile-photos, interview-recordings
-- All should have public = false

-- 12. Check if RLS is enabled on all tables
SELECT '🔒 RLS (Row Level Security) Check' as section;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'roles', 'profiles', 'user_roles', 'candidates', 'positions', 
  'applications', 'questions', 'question_sets', 'question_set_questions',
  'interviews', 'interview_questions', 'recordings', 'evaluations',
  'evaluation_scores', 'evaluation_categories', 'status_history', 'audit_logs'
)
ORDER BY tablename;

-- All tables should show rls_enabled = true

-- 13. Check RLS policies count
SELECT '📜 RLS Policies Count' as section;

SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 14. Check evaluation categories
SELECT '🏷️ Evaluation Categories Check' as section;

SELECT 
  id,
  name,
  weight,
  is_active
FROM evaluation_categories
ORDER BY name;

-- 15. Summary counts
SELECT '📊 Summary' as section;

SELECT 
  (SELECT COUNT(*) FROM roles) as roles_count,
  (SELECT COUNT(*) FROM profiles) as profiles_count,
  (SELECT COUNT(*) FROM user_roles) as user_roles_count,
  (SELECT COUNT(*) FROM candidates) as candidates_count,
  (SELECT COUNT(*) FROM positions) as positions_count,
  (SELECT COUNT(*) FROM questions) as questions_count,
  (SELECT COUNT(*) FROM question_sets) as question_sets_count,
  (SELECT COUNT(*) FROM interviews) as interviews_count,
  (SELECT COUNT(*) FROM recordings) as recordings_count,
  (SELECT COUNT(*) FROM evaluations) as evaluations_count;

-- 16. Check for any errors in the setup
SELECT '✅ Final Verification' as section;

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM roles) = 2 THEN '✅ Roles: OK (2 roles)'
    ELSE '❌ Roles: Expected 2, found ' || (SELECT COUNT(*) FROM roles)
  END as roles_status,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM storage.buckets WHERE name IN ('candidate-cvs', 'candidate-profile-photos', 'interview-recordings')) = 3 THEN '✅ Storage: OK (3 buckets)'
    ELSE '❌ Storage: Missing buckets'
  END as storage_status,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true AND tablename IN ('roles', 'profiles', 'candidates', 'positions', 'questions', 'interviews', 'recordings', 'evaluations')) >= 8 THEN '✅ RLS: OK (enabled on all tables)'
    ELSE '❌ RLS: Not enabled on all tables'
  END as rls_status;

-- ============================================================================
-- END OF VERIFICATION SCRIPT
-- ============================================================================
