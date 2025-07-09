export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  questions?: Question[];
  category: string;
  time_limit?: number; // in minutes
  max_attempts?: number; // maximum attempts per user
}

export interface Question {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  category: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  answers: UserAnswer[] | string;
  completed_at: string;
  time_taken: number;
}

export interface UserAnswer {
  question_id: string;
  selected_answer: number;
  is_correct: boolean;
  category: string;
  question?: string;
  options?: string[];
  correct_answer?: number;
}

export interface CategoryPerformance {
  category: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface UserProgress {
  totalQuizzes: number;
  averageScore: number;
  strongCategories: string[];
  weakCategories: string[];
  recentAttempts: QuizAttempt[];
}