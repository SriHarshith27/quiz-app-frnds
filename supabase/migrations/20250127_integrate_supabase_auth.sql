-- Migration to integrate Supabase Authentication
-- This migration modifies the users table to work with Supabase's built-in authentication

-- Drop the old users table if it exists with the wrong structure
DROP TABLE IF EXISTS users CASCADE;

-- Create users table that references auth.users
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (for registration)
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin can see all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create or replace function to automatically create user profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update existing tables to ensure proper foreign key relationships
-- Update quizzes table to reference the new users table
ALTER TABLE IF EXISTS quizzes 
  DROP CONSTRAINT IF EXISTS quizzes_created_by_fkey;

ALTER TABLE IF EXISTS quizzes 
  ADD CONSTRAINT quizzes_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- Update quiz_attempts table to reference the new users table
ALTER TABLE IF EXISTS quiz_attempts 
  DROP CONSTRAINT IF EXISTS quiz_attempts_user_id_fkey;

ALTER TABLE IF EXISTS quiz_attempts 
  ADD CONSTRAINT quiz_attempts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Enable RLS on related tables if they exist
ALTER TABLE IF EXISTS quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quizzes
DROP POLICY IF EXISTS "Users can view all quizzes" ON quizzes;
CREATE POLICY "Users can view all quizzes" ON quizzes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own quizzes" ON quizzes;
CREATE POLICY "Users can create their own quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own quizzes" ON quizzes;
CREATE POLICY "Users can update their own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own quizzes" ON quizzes;
CREATE POLICY "Users can delete their own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = created_by);

-- Create RLS policies for questions
DROP POLICY IF EXISTS "Users can view all questions" ON questions;
CREATE POLICY "Users can view all questions" ON questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Quiz creators can manage questions" ON questions;
CREATE POLICY "Quiz creators can manage questions" ON questions
  FOR ALL USING (
    auth.uid() IN (
      SELECT created_by FROM quizzes WHERE id = questions.quiz_id
    )
  );

-- Create RLS policies for quiz_attempts
DROP POLICY IF EXISTS "Users can view their own attempts" ON quiz_attempts;
CREATE POLICY "Users can view their own attempts" ON quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own attempts" ON quiz_attempts;
CREATE POLICY "Users can create their own attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Quiz creators can view attempts on their quizzes" ON quiz_attempts;
CREATE POLICY "Quiz creators can view attempts on their quizzes" ON quiz_attempts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT created_by FROM quizzes WHERE id = quiz_attempts.quiz_id
    )
  );

-- Admins can see all data
DROP POLICY IF EXISTS "Admins can view all quizzes" ON quizzes;
CREATE POLICY "Admins can view all quizzes" ON quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all questions" ON questions;
CREATE POLICY "Admins can view all questions" ON questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all attempts" ON quiz_attempts;
CREATE POLICY "Admins can view all attempts" ON quiz_attempts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
