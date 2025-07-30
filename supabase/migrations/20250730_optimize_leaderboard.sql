-- Create an optimized leaderboard function
-- This function will be much faster than doing the calculation in JavaScript

CREATE OR REPLACE FUNCTION get_leaderboard(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  userId UUID,
  username TEXT, 
  score INTEGER,
  quizId UUID,
  completedAt TIMESTAMP WITH TIME ZONE,
  totalQuestions INTEGER,
  timeSpent INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_attempts AS (
    SELECT 
      qa.user_id,
      u.username,
      qa.score,
      qa.quiz_id,
      qa.completed_at,
      qa.total_questions,
      qa.time_taken,
      ROW_NUMBER() OVER (PARTITION BY qa.user_id ORDER BY qa.score DESC, qa.completed_at DESC) as rn
    FROM quiz_attempts qa
    INNER JOIN users u ON qa.user_id = u.id
    WHERE qa.completed_at IS NOT NULL
      AND qa.score IS NOT NULL
  )
  SELECT 
    ra.user_id as userId,
    ra.username,
    ra.score,
    ra.quiz_id as quizId,
    ra.completed_at as completedAt,
    COALESCE(ra.total_questions, 10) as totalQuestions,
    COALESCE(ra.time_taken, 0) as timeSpent
  FROM ranked_attempts ra
  WHERE ra.rn = 1
  ORDER BY ra.score DESC, ra.completed_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_leaderboard(INTEGER) TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_score 
ON quiz_attempts(user_id, score DESC, completed_at DESC) 
WHERE completed_at IS NOT NULL AND score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_score_desc 
ON quiz_attempts(score DESC, completed_at DESC) 
WHERE completed_at IS NOT NULL AND score IS NOT NULL;
