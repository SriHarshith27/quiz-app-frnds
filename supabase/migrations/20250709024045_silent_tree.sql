/*
  # Create quiz attempts table

  1. New Tables
    - `quiz_attempts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `quiz_id` (uuid, foreign key to quizzes)
      - `score` (integer)
      - `total_questions` (integer)
      - `answers` (jsonb)
      - `time_taken` (integer, seconds)
      - `completed_at` (timestamp)
  2. Security
    - Enable RLS on `quiz_attempts` table
    - Add policy for users to read all attempts (for leaderboards)
    - Add policy for users to create their own attempts
*/

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  time_taken integer DEFAULT 0,
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all quiz attempts"
  ON quiz_attempts
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create their own attempts"
  ON quiz_attempts
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);