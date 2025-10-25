import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { User } from '../types';

// Query Keys - centralized for consistency
export const QUERY_KEYS = {
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  quizzes: ['quizzes'] as const,
  quiz: (id: string) => ['quizzes', id] as const,
  userQuizzes: (userId: string) => ['quizzes', 'user', userId] as const,
  quizAttempts: ['quiz-attempts'] as const,
  userAttempts: (userId: string) => ['quiz-attempts', 'user', userId] as const,
  userQuizAttempts: (userId: string, quizId: string) => ['quiz-attempts', 'user', userId, 'quiz', quizId] as const,
  quizResults: (quizId: string) => ['quiz-attempts', 'quiz', quizId] as const,
  leaderboard: ['leaderboard'] as const,
  analytics: ['analytics'] as const,
} as const;

// User-related queries - optimized
export const useUsers = () => {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, role, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // Reduced from 5 minutes to 2 minutes
    gcTime: 5 * 60 * 1000, // Reduced from 10 minutes to 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};

export const useUser = (userId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.user(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // Reduced from 5 minutes to 2 minutes
  });
};

export const useQuizzes = () => {
  return useQuery({
    queryKey: QUERY_KEYS.quizzes,
    queryFn: async () => {
      // UPDATED: This query is now simplified to prevent join errors.
      const { data, error } = await supabase
        .from('quizzes')
        .select('*') // Select all columns directly from the quizzes table
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useQuiz = (quizId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.quiz(quizId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions (*),
          users (username)
        `)
        .eq('id', quizId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!quizId,
    staleTime: 15 * 60 * 1000, 
  });
};

export const useUserQuizzes = (userId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.userQuizzes(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions (count)
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

// Quiz attempts and results
export const useUserAttempts = (userId: string, options: { enabled?: boolean } = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.userAttempts(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes (title, category)
        `)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    // The 'enabled' option is now correctly passed to React Query
    enabled: !!userId && (options.enabled ?? true),
    staleTime: 1 * 60 * 1000,
  });
};

export const useUserQuizAttempts = (userId: string, quizId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.userQuizAttempts(userId, quizId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!quizId,
    staleTime: 1 * 60 * 1000, // User attempts change more frequently
  });
};

export const useQuizResults = (quizId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.quizResults(quizId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          users (username)
        `)
        .eq('quiz_id', quizId)
        .order('score', { ascending: false })
        .limit(100); // Limit to top 100 results
      
      if (error) throw error;
      return data;
    },
    enabled: !!quizId,
    staleTime: 2 * 60 * 1000,
  });
};

// Leaderboard - optimized with better caching
export const useLeaderboard = () => {
  return useQuery({
    queryKey: QUERY_KEYS.leaderboard,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_leaderboard', {
          limit_count: 50
        });
        
        if (!error && data) {
          return data;
        }
        
        console.log('RPC failed, using fallback query:', error);
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('quiz_attempts')
          .select(`
            user_id,
            score,
            total_questions,
            quiz_id,
            time_taken,
            completed_at,
            users!inner (username)
          `)
          .order('score', { ascending: false })
          .order('completed_at', { ascending: false })
          .limit(200);
        
        if (fallbackError) throw fallbackError;
        
        const userScoresMap = new Map();
        
        fallbackData.forEach((attempt: any) => {
          const userId = attempt.user_id;
          const percentage = (attempt.score / attempt.total_questions) * 100;
          const currentBest = userScoresMap.get(userId);
          
          if (!currentBest || percentage > currentBest.percentage) {
            userScoresMap.set(userId, {
              userId,
              username: attempt.users.username,
              score: percentage,
              quizId: attempt.quiz_id,
              completedAt: attempt.completed_at,
              totalQuestions: attempt.total_questions,
              timeSpent: attempt.time_taken || 0
            });
          }
        });
        
        return Array.from(userScoresMap.values())
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 50);
          
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
      }
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
};

// Analytics data
export const useAnalytics = () => {
  return useQuery({
    queryKey: QUERY_KEYS.analytics,
    queryFn: async () => {
      const [quizzesResult, usersResult, attemptsResult] = await Promise.all([
        supabase.from('quizzes').select('id, title, category, created_at'),
        supabase.from('users').select('id, created_at').neq('role', 'admin'),
        supabase.from('quiz_attempts').select(`
          id, score, completed_at, quiz_id,
          quizzes (title, category)
        `),
      ]);

      if (quizzesResult.error) throw quizzesResult.error;
      if (usersResult.error) throw usersResult.error;
      if (attemptsResult.error) throw attemptsResult.error;

      return {
        quizzes: quizzesResult.data,
        users: usersResult.data,
        attempts: attemptsResult.data,
      };
    },
    staleTime: 5 * 60 * 1000, // Analytics data can be slightly stale
  });
};

// Mutations for creating/updating data
export const useCreateQuiz = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (quizData: any) => {
      const { data, error } = await supabase
        .from('quizzes')
        .insert([quizData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Immediately update the quizzes list with optimistic update
      queryClient.setQueryData(QUERY_KEYS.quizzes, (oldData: any) => {
        if (!oldData) return [data];
        return [data, ...oldData];
      });
      
      // Invalidate related queries for full consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userQuizzes(data.created_by) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.analytics });
    },
  });
};

export const useSubmitQuizAttempt = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attemptData: any) => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert([attemptData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Smart cache invalidation - only invalidate what's necessary
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userAttempts(data.user_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userQuizAttempts(data.user_id, data.quiz_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quizResults(data.quiz_id) });
      
      // For leaderboard and analytics, use a more targeted approach
      // Only invalidate if this could potentially affect the top scores
      if (data.score > 0) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaderboard });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.analytics });
      }
    },
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Optimistically update the specific user cache
      queryClient.setQueryData(QUERY_KEYS.user(data.id), data);
      
      // Update the users list optimistically
      queryClient.setQueryData(QUERY_KEYS.users, (oldData: any) => {
        if (!oldData) return [data];
        return oldData.map((user: any) => user.id === data.id ? data : user);
      });
      
      // Only invalidate analytics if role changed (as it might affect admin counts)
      const oldUser = queryClient.getQueryData(QUERY_KEYS.user(data.id)) as any;
      if (oldUser?.role !== data.role) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.analytics });
      }
    },
  });
};
