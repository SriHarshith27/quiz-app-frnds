/*
  # Add timer functionality to quizzes

  1. Changes
    - Add `time_limit` column to quizzes table (in minutes)
    - Update existing quizzes to have no time limit by default
  
  2. Notes
    - time_limit is optional (can be null for unlimited time)
    - Stored in minutes for easier management
*/

-- Add time_limit column to quizzes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'time_limit'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN time_limit integer;
  END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN quizzes.time_limit IS 'Time limit for quiz in minutes. NULL means no time limit.';