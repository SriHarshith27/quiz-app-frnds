-- Legacy User Password Reset SQL Script
-- Run this in your Supabase SQL Editor

-- First, let's check the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check if we have any users at all
SELECT COUNT(*) as total_user_count FROM users;

-- View all users and their columns (first 10)
SELECT * FROM users ORDER BY created_at DESC;

-- Check if password column exists and has data
SELECT COUNT(*) as users_with_password 
FROM users 
WHERE password IS NOT NULL;

-- OPTION 1: Reset all legacy passwords to "pass123"
-- This bcrypt hash corresponds to "pass123" with salt rounds 12
UPDATE users 
SET password = '$2b$12$nAuLLv8lKsTMI55GaZgARutOUiu7qJhIrUfHlks9F7hYnl3v0mxLy',
    updated_at = NOW()
WHERE password IS NOT NULL;

-- OPTION 2: If you want a different password, generate the hash first
-- In Node.js/browser console:
-- const bcrypt = require('bcryptjs');
-- const hash = await bcrypt.hash('your-new-password', 12);
-- Then replace the hash above with your generated hash

-- Verify the update
SELECT COUNT(*) as updated_users
FROM users 
WHERE password = '$2b$12$nAuLLv8lKsTMI55GaZgARutOUiu7qJhIrUfHlks9F7hYnl3v0mxLy';

-- OPTION 3: If you want to clear all legacy passwords (remove password field)
-- This would make them unable to login with old system
-- UPDATE users SET password = NULL WHERE password IS NOT NULL;

-- Get list of users to notify (save this for emailing them)
SELECT 
    email,
    username,
    'pass123' as new_password,
    'Please use this temporary password and change it after login' as note
FROM users 
WHERE password IS NOT NULL
ORDER BY email;
