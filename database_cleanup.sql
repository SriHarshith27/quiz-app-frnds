-- Clean up script for migrating from bcrypt to Supabase Auth
-- Run this in your Supabase SQL Editor if you have old user records

-- 1. First, check if there are any existing users
SELECT * FROM auth.users;
SELECT * FROM users;

-- 2. If you want to clean up old users (BE CAREFUL - THIS DELETES DATA!)
-- Uncomment the lines below ONLY if you want to start fresh:

-- DELETE FROM users;
-- DELETE FROM auth.users;

-- 3. Alternative: Update existing users to work with Supabase auth
-- This is safer if you want to preserve user data
-- But you'll need to reset passwords for all users

-- UPDATE users SET password = NULL WHERE password IS NOT NULL;
