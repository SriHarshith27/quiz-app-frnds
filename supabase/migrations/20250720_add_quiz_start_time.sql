-- Add start_time column to quizzes table
ALTER TABLE public.quizzes ADD COLUMN start_time TIMESTAMPTZ;

COMMENT ON COLUMN public.quizzes.start_time IS 'Timestamp when the quiz becomes accessible. NULL means immediately accessible.';
