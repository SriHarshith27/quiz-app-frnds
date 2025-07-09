/*
  # Create quizzes table

  1. New Tables
    - `quizzes`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `category` (text)
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `quizzes` table
    - Add policy for users to read all quizzes
    - Add policy for users to create quizzes
*/

CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'General',
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all quizzes"
  ON quizzes
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create quizzes"
  ON quizzes
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);