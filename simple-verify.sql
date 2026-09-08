-- Simple verification query that returns actual rows
-- Run this in Supabase SQL Editor to see your setup status

-- 1. Check roles (should be exactly 2: CANDIDATE and HR)
SELECT 'ROLES' as check_type, name as value FROM roles ORDER BY name;

-- 2. Check storage buckets (should be 3 private buckets)
SELECT 'BUCKETS' as check_type, name as value, public as is_public 
FROM storage.buckets 
ORDER BY name;

-- 3. Count your data
SELECT 'DATA COUNTS' as check_type, 
       (SELECT COUNT(*) FROM candidates) || ' candidates' as value
UNION ALL
SELECT 'DATA COUNTS', (SELECT COUNT(*) FROM positions) || ' positions'
UNION ALL
SELECT 'DATA COUNTS', (SELECT COUNT(*) FROM questions) || ' questions'
UNION ALL
SELECT 'DATA COUNTS', (SELECT COUNT(*) FROM question_sets) || ' question sets'
UNION ALL
SELECT 'DATA COUNTS', (SELECT COUNT(*) FROM interviews) || ' interviews'
UNION ALL
SELECT 'DATA COUNTS', (SELECT COUNT(*) FROM recordings) || ' recordings'
UNION ALL
SELECT 'DATA COUNTS', (SELECT COUNT(*) FROM evaluations) || ' evaluations';

-- 4. Check if RLS is enabled
SELECT 'RLS STATUS' as check_type, 
       tablename as value,
       rowsecurity as is_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('candidates', 'positions', 'questions', 'interviews', 'recordings', 'evaluations')
ORDER BY tablename;

-- 5. Check your users and their roles
SELECT 'USERS' as check_type,
       p.email as value,
       r.name as role_name
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN roles r ON r.id = ur.role_id
ORDER BY p.email;
