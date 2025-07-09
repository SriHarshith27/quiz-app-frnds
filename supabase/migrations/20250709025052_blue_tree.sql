/*
  # Add user roles and authentication

  1. New Tables
    - Update users table to include role and authentication fields
    - Add proper authentication support
  
  2. Security
    - Update RLS policies for role-based access
    - Admin can see all data, users can only see their own attempts
*/

-- Add role and authentication fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text UNIQUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('admin', 'user'));
  END IF;
END $$;

-- Create admin user (you'll need to hash the password properly in production)
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@quiz.com', 'admin123', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can read all user data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;

CREATE POLICY "Anyone can read users for login"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can register"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Update quiz policies for admin-only creation
DROP POLICY IF EXISTS "Users can create quizzes" ON quizzes;

CREATE POLICY "Only admins can create quizzes"
  ON quizzes
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = created_by 
      AND users.role = 'admin'
    )
  );

-- Update quiz attempts policies
DROP POLICY IF EXISTS "Users can read all quiz attempts" ON quiz_attempts;

CREATE POLICY "Users can read their own attempts, admins can read all"
  ON quiz_attempts
  FOR SELECT
  TO authenticated, anon
  USING (
    user_id IN (
      SELECT id FROM users WHERE username = current_setting('app.current_user', true)
    )
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE username = current_setting('app.current_user', true)
      AND role = 'admin'
    )
  );