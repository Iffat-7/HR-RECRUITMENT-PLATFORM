-- ============================================================================
-- SEED DATA FOR TESTING
-- Run this in Supabase SQL Editor to populate your database with test data
-- ============================================================================

-- 1. Insert the 2 roles (HR and CANDIDATE)
INSERT INTO roles (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'HR', 'Human Resources - manages candidates and evaluations'),
  ('22222222-2222-2222-2222-222222222222', 'CANDIDATE', 'Job seeker - applies for positions')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert test positions
INSERT INTO positions (id, title, department, description, is_active) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Senior Software Engineer', 'Engineering', 'We are looking for an experienced software engineer to join our team.', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Product Manager', 'Product', 'Seeking a product manager to lead our product development.', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'UX Designer', 'Design', 'Looking for a UX designer to create amazing user experiences.', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert test questions
INSERT INTO questions (id, question_text, category, response_type, max_duration_seconds, preparation_time_seconds, max_retakes, is_required, is_active) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 
   'Tell us about yourself and your experience.', 
   'Introduction', 
   'video', 
   120, 
   30, 
   2, 
   true, 
   true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 
   'Why are you interested in this position?', 
   'Motivation', 
   'video', 
   90, 
   30, 
   2, 
   true, 
   true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 
   'Describe a challenging project you worked on.', 
   'Experience', 
   'video', 
   180, 
   45, 
   1, 
   true, 
   true),
  ('11111111-2222-3333-4444-555555555555', 
   'What are your salary expectations?', 
   'Logistics', 
   'audio', 
   60, 
   15, 
   3, 
   false, 
   true)
ON CONFLICT (id) DO NOTHING;

-- 4. Insert a question set
INSERT INTO question_sets (id, name, description, position_id, is_active) VALUES
  ('66666666-6666-6666-6666-666666666666', 
   'Standard Interview Questions', 
   'Core questions for all candidates', 
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   true)
ON CONFLICT (id) DO NOTHING;

-- 5. Link questions to the question set
INSERT INTO question_set_questions (question_set_id, question_id, display_order) VALUES
  ('66666666-6666-6666-6666-666666666666', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 1),
  ('66666666-6666-6666-6666-666666666666', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 2),
  ('66666666-6666-6666-6666-666666666666', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 3),
  ('66666666-6666-6666-6666-666666666666', '11111111-2222-3333-4444-555555555555', 4)
ON CONFLICT DO NOTHING;

-- 6. Insert evaluation categories
INSERT INTO evaluation_categories (id, name, description, weight, is_active) VALUES
  ('77777777-7777-7777-7777-777777777777', 'Communication Skills', 'Clarity, articulation, and presentation', 25, true),
  ('88888888-8888-8888-8888-888888888888', 'Technical Knowledge', 'Depth of technical expertise', 30, true),
  ('99999999-9999-9999-9999-999999999999', 'Problem Solving', 'Analytical thinking and approach', 25, true),
  ('aaaaaaaa-1111-2222-3333-444444444444', 'Cultural Fit', 'Alignment with company values', 20, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- Run these queries to confirm the seed data was inserted
-- ============================================================================

-- Check roles
SELECT 'Roles' as table_name, COUNT(*) as count FROM roles;

-- Check positions
SELECT 'Positions' as table_name, COUNT(*) as count FROM positions;

-- Check questions
SELECT 'Questions' as table_name, COUNT(*) as count FROM questions;

-- Check question sets
SELECT 'Question Sets' as table_name, COUNT(*) as count FROM question_sets;

-- Check evaluation categories
SELECT 'Evaluation Categories' as table_name, COUNT(*) as count FROM evaluation_categories;

-- Show all positions
SELECT id, title, department FROM positions ORDER BY title;

-- Show all questions
SELECT id, question_text, category, response_type FROM questions ORDER BY category;

-- ============================================================================
-- NEXT STEPS
-- 1. Create a user in Supabase Auth (Authentication → Users → Add User)
-- 2. Assign them the HR role:
--    INSERT INTO user_roles (user_id, role_id)
--    SELECT '[USER_ID]', '11111111-1111-1111-1111-111111111111';
-- 3. Test the application in your browser
-- ============================================================================
