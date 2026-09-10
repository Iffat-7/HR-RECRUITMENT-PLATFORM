-- ============================================================================
-- QUICK START SCRIPT - Run This First!
-- This script sets up everything you need to test TalentGate V1.2
-- ============================================================================

-- Step 1: Verify the database is ready
DO $$
BEGIN
  -- Check if roles table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    RAISE EXCEPTION 'Database not initialized. Please run migrations 0001-0004 first.';
  END IF;
  
  RAISE NOTICE '✅ Database schema verified';
END $$;

-- Step 2: Insert roles (HR and CANDIDATE)
INSERT INTO roles (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'HR', 'Human Resources - manages candidates and evaluations'),
  ('22222222-2222-2222-2222-222222222222', 'CANDIDATE', 'Job seeker - applies for positions')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Insert test positions
INSERT INTO positions (id, title, department, description, is_active) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Senior Software Engineer', 'Engineering', 'We are looking for an experienced software engineer to join our team.', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Product Manager', 'Product', 'Seeking a product manager to lead our product development.', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'UX Designer', 'Design', 'Looking for a UX designer to create amazing user experiences.', true)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Insert test questions
INSERT INTO questions (id, question_text, category, response_type, max_duration_seconds, preparation_time_seconds, max_retakes, is_required, is_active) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Tell us about yourself and your experience.', 'Introduction', 'video', 120, 30, 2, true, true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Why are you interested in this position?', 'Motivation', 'video', 90, 30, 2, true, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Describe a challenging project you worked on.', 'Experience', 'video', 180, 45, 1, true, true),
  ('11111111-2222-3333-4444-555555555555', 'What are your salary expectations?', 'Logistics', 'audio', 60, 15, 3, false, true)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Insert a question set
INSERT INTO question_sets (id, name, description, position_id, is_active) VALUES
  ('66666666-6666-6666-6666-666666666666', 'Standard Interview Questions', 'Core questions for all candidates', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true)
ON CONFLICT (id) DO NOTHING;

-- Step 6: Link questions to the question set
INSERT INTO question_set_questions (question_set_id, question_id, display_order) VALUES
  ('66666666-6666-6666-6666-666666666666', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 1),
  ('66666666-6666-6666-6666-666666666666', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 2),
  ('66666666-6666-6666-6666-666666666666', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 3),
  ('66666666-6666-6666-6666-666666666666', '11111111-2222-3333-4444-555555555555', 4)
ON CONFLICT DO NOTHING;

-- Step 7: Insert evaluation categories
INSERT INTO evaluation_categories (id, name, description, weight, is_active) VALUES
  ('77777777-7777-7777-7777-777777777777', 'Communication Skills', 'Clarity, articulation, and presentation', 25, true),
  ('88888888-8888-8888-8888-888888888888', 'Technical Knowledge', 'Depth of technical expertise', 30, true),
  ('99999999-9999-9999-9999-999999999999', 'Problem Solving', 'Analytical thinking and approach', 25, true),
  ('aaaaaaaa-1111-2222-3333-444444444444', 'Cultural Fit', 'Alignment with company values', 20, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION - Check what was inserted
-- ============================================================================

SELECT '✅ Quick Start Complete!' as status;

SELECT 'Roles' as category, COUNT(*) as count FROM roles
UNION ALL
SELECT 'Positions', COUNT(*) FROM positions
UNION ALL
SELECT 'Questions', COUNT(*) FROM questions
UNION ALL
SELECT 'Question Sets', COUNT(*) FROM question_sets
UNION ALL
SELECT 'Evaluation Categories', COUNT(*) FROM evaluation_categories;

-- ============================================================================
-- NEXT STEP: Create Your HR User
-- ============================================================================

-- After running this script, you need to:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create New User"
-- 3. Enter your email and password
-- 4. Copy the User UID from the users list
-- 5. Run the SQL below (replace YOUR_USER_UID with the actual UID)

/*
INSERT INTO user_roles (user_id, role_id)
VALUES ('YOUR_USER_UID', '11111111-1111-1111-1111-111111111111');
*/

-- Then you can login to the app and start testing!
