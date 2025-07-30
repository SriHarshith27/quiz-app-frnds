-- Solution for users who can't reset passwords
-- Since all users are using Supabase Auth, here's how to help them

-- 1. View all users in your system
SELECT id, username, email, role, created_at 
FROM users 
ORDER BY created_at DESC;

-- 2. For users who can't reset password, you can:
--    a) Check if they exist in Supabase Auth
--    b) Manually invite them again
--    c) Create a temporary admin reset

-- 3. If you want to add password reset capability for specific users:
-- Add password column (if needed)
-- ALTER TABLE users ADD COLUMN password TEXT;

-- 4. Set a default password for all users (optional)
-- UPDATE users SET password = '$2b$12$nAuLLv8lKsTMI55GaZgARutOUiu7qJhIrUfHlks9F7hYnl3v0mxLy';

-- 5. For immediate help to your users:
-- Create a list of users who need password help
SELECT 
    email,
    username,
    'User can try: Forgot Password feature or contact admin' as help_message,
    created_at
FROM users 
ORDER BY email;

-- 6. Alternative: Create temporary passwords for specific users
-- UPDATE users 
-- SET password = '$2b$12$nAuLLv8lKsTMI55GaZgARutOUiu7qJhIrUfHlks9F7hYnl3v0mxLy'
-- WHERE email IN ('user1@example.com', 'user2@example.com');

-- 7. Check Supabase Auth settings:
-- Go to Supabase Dashboard > Authentication > Settings
-- Make sure "Enable email confirmations" is properly configured
-- Verify "Site URL" and "Redirect URLs" are set correctly
