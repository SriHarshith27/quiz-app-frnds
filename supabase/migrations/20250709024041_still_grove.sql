/*
  # Create questions table

  1. New Tables
    - `questions`
      - `id` (uuid, primary key)
      - `quiz_id` (uuid, foreign key to quizzes)
      - `question` (text)
      - `options` (text array)
      - `correct_answer` (integer)
      - `category` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `questions` table
    - Add policy for users to read all questions
    - Add policy for users to create questions
*/

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  question text NOT NULL,
  options text[] NOT NULL,
  correct_answer integer NOT NULL DEFAULT 0,
  category text DEFAULT 'General',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all questions"
  ON questions
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create questions"
  ON questions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);