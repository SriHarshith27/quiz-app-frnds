/*
  # Update authentication system for admin/user roles

  1. Updates
    - Ensure all required columns exist in users table
    - Create admin user if not exists
    - Update RLS policies for proper role-based access
    - Add indexes for better performance
  
  2. Security
    - Admin can see all data
    - Users can only see their own attempts and all quizzes
    - Proper authentication flow
*/

-- Ensure email column exists and is unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text UNIQUE;
  END IF;
END $$;

-- Ensure password_hash column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash text;
  END IF;
END $$;

-- Ensure role column exists with proper constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role text DEFAULT 'user';
  END IF;
END $$;

-- Add role constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_role_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user'));
  END IF;
END $$;

-- Create admin user (using simple base64 encoding - replace with bcrypt in production)
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@quiz.com', 'YWRtaW4xMjM=', 'admin')
ON CONFLICT (email) DO UPDATE SET 
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role;

-- Create function to set current user context
CREATE OR REPLACE FUNCTION set_config(setting_name text, setting_value text)
RETURNS void AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, false);
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for users table
DROP POLICY IF EXISTS "Users can read all user data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Anyone can read users for login" ON users;
DROP POLICY IF EXISTS "Anyone can register" ON users;

CREATE POLICY "Anyone can read users for authentication"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can register new users"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Update RLS policies for quizzes
DROP POLICY IF EXISTS "Users can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Only admins can create quizzes" ON quizzes;

CREATE POLICY "Anyone can read quizzes"
  ON quizzes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Only admins can create quizzes"
  ON quizzes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = created_by 
      AND users.role = 'admin'
    )
  );

-- Update RLS policies for questions
DROP POLICY IF EXISTS "Users can create questions" ON questions;

CREATE POLICY "Only admins can create questions"
  ON questions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes 
      JOIN users ON users.id = quizzes.created_by
      WHERE quizzes.id = quiz_id 
      AND users.role = 'admin'
    )
  );

-- Update RLS policies for quiz attempts
DROP POLICY IF EXISTS "Users can read all quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can read their own attempts, admins can read all" ON quiz_attempts;

CREATE POLICY "Users can read their attempts, admins read all"
  ON quiz_attempts
  FOR SELECT
  TO anon, authenticated
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);