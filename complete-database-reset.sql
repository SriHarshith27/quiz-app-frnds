-- Complete Database Reset and Setup Script
-- WARNING: This will delete ALL data from ALL tables
-- Make sure you have backups if needed

-- STEP 1: Truncate all tables (remove all data)
-- Order matters due to foreign key constraints - child tables first
TRUNCATE TABLE coding_submissions CASCADE;
TRUNCATE TABLE coding_question_test_cases CASCADE;
TRUNCATE TABLE coding_questions CASCADE;
TRUNCATE TABLE user_favorites CASCADE;
TRUNCATE TABLE quiz_attempts CASCADE;
TRUNCATE TABLE questions CASCADE;
TRUNCATE TABLE quizzes CASCADE;
TRUNCATE TABLE users CASCADE;

-- STEP 2: Add password column to users table
ALTER TABLE users ADD COLUMN password TEXT;

-- STEP 3: Verify the new table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- STEP 4: Create test users through Supabase Auth
-- Note: Test users should be created through the application's registration flow
-- or through Supabase Auth admin functions, not directly in the users table
-- The database trigger will automatically create profiles when users sign up

-- Example users can be created through Supabase Dashboard or Auth API:
-- 1. admin@example.com (role: admin)
-- 2. john@example.com (role: user) 
-- 3. jane@example.com (role: user)
-- 4. mike@example.com (role: user)

-- STEP 5: Verify the data
SELECT id, username, email, role, created_at
FROM users 
ORDER BY created_at;

-- STEP 6: Test login credentials
-- All users can login with password: "pass123"
SELECT 
    email as login_email,
    'pass123' as login_password,
    role,
    'Use these credentials to test login' as note
FROM users 
ORDER BY role DESC, email;
