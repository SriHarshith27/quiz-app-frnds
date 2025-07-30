-- Current Users Analysis Script
-- Run this in your Supabase SQL Editor to understand your user structure

-- 1. Check what columns exist in users table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. View all users in your system
SELECT id, username, email, role, created_at 
FROM users 
ORDER BY created_at DESC;

-- 3. Check Supabase Auth users (if accessible)
-- Note: auth.users might not be accessible depending on RLS settings
-- SELECT id, email, created_at, email_confirmed_at 
-- FROM auth.users 
-- ORDER BY created_at DESC;

-- 4. Count total users
SELECT COUNT(*) as total_users FROM users;

-- 5. Check if password column exists at all
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'password'
) as password_column_exists;

-- If you need to ADD a password column for legacy users, run:
-- ALTER TABLE users ADD COLUMN password TEXT;

-- Then you can set default passwords:
-- UPDATE users SET password = '$2b$12$nAuLLv8lKsTMI55GaZgARutOUiu7qJhIrUfHlks9F7hYnl3v0mxLy';

-- To remove password column if not needed:
-- ALTER TABLE users DROP COLUMN password;
