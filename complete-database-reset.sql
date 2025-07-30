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

-- STEP 4: Create some test users with bcrypt passwords
-- Password for all test users will be "pass123"
-- Bcrypt hash: $2b$12$nAuLLv8lKsTMI55GaZgARutOUiu7qJhIrUfHlks9F7hYnl3v0mxLy

INSERT INTO users (id, username, email, role, password, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'admin', 'admin@example.com', 'admin', '$2b$12$nAuLLv8lKsTMI55GaZgARutOUiu7qJhIrUfHlks9F7hYnl3v0mxLy', NOW()),
('22222222-2222-2222-2222-222222222222', 'john_doe', 'john@example.com', 'user', '$2b$12$nAuLLv8lKsTMI55GaZgARutOUiu7qJhIrUfHlks9F7hYnl3v0mxLy', NOW()),
('33333333-3333-3333-3333-333333333333', 'jane_smith', 'jane@example.com', 'user', '$2b$12$nAuLLv8lKsTMI55GaZgARutOUiu7qJhIrUfHlks9F7hYnl3v0mxLy', NOW()),
('44444444-4444-4444-4444-444444444444', 'mike_wilson', 'mike@example.com', 'user', '$2b$12$nAuLLv8lKsTMI55GaZgARutOUiu7qJhIrUfHlks9F7hYnl3v0mxLy', NOW());

-- STEP 5: Verify the data
SELECT id, username, email, role, 
       CASE WHEN password IS NOT NULL THEN 'HAS PASSWORD' ELSE 'NO PASSWORD' END as password_status,
       created_at
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
