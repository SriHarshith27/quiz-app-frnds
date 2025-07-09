/*
  # Add attempt limits to quizzes

  1. Changes
    - Add `max_attempts` column to quizzes table
    - Default to unlimited attempts (null)
  
  2. Notes
    - max_attempts is optional (null means unlimited)
    - Stored as integer for number of allowed attempts
*/

-- Add max_attempts column to quizzes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'max_attempts'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN max_attempts integer;
  END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN quizzes.max_attempts IS 'Maximum number of attempts allowed per user. NULL means unlimited attempts.';