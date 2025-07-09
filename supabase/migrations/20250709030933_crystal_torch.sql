-- Fix RLS policies to allow anonymous access for quiz attempts

-- Update quiz_attempts policies to allow anonymous users to insert
DROP POLICY IF EXISTS "Users can create their own attempts" ON quiz_attempts;

CREATE POLICY "Anyone can create quiz attempts"
  ON quiz_attempts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Update quiz_attempts select policy to be more permissive
DROP POLICY IF EXISTS "Users can read their attempts, admins read all" ON quiz_attempts;

CREATE POLICY "Users can read quiz attempts"
  ON quiz_attempts
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Ensure all other tables allow anonymous access for reading
DROP POLICY IF EXISTS "Users can read all questions" ON questions;
CREATE POLICY "Anyone can read questions"
  ON questions
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can read all quizzes" ON quizzes;
CREATE POLICY "Anyone can read quizzes"
  ON quizzes
  FOR SELECT
  TO anon, authenticated
  USING (true);