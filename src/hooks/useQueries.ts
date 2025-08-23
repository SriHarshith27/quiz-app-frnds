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
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          description,
          created_at,
          created_by,
          questions (count),
          users (username)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 3 * 60 * 1000, // Reduced from 15 minutes to 3 minutes
    gcTime: 10 * 60 * 1000, // Reduced from 30 minutes to 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
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
    staleTime: 15 * 60 * 1000, // Individual quiz data is quite stable
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
export const useUserAttempts = (userId: string) => {
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
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // User attempts change more frequently
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
      // Use a more efficient query with CTE (Common Table Expression)
      const { data, error } = await supabase.rpc('get_leaderboard', {
        limit_count: 50
      });
      
      if (error) {
        // Fallback to original query if RPC fails
        console.log('RPC failed, using fallback query');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('quiz_attempts')
          .select(`
            user_id,
            score,
            quiz_id,
            completed_at,
            users!inner (username)
          `)
          .order('score', { ascending: false })
          .limit(50);
        
        if (fallbackError) throw fallbackError;
        
        // Group by user and calculate best scores efficiently
        const userScoresMap = new Map();
        fallbackData.forEach((attempt: any) => {
          const userId = attempt.user_id;
          const currentBest = userScoresMap.get(userId);
          
          if (!currentBest || currentBest.score < attempt.score) {
            userScoresMap.set(userId, {
              userId,
              username: attempt.users.username,
              score: attempt.score,
              quizId: attempt.quiz_id,
              completedAt: attempt.completed_at,
              totalQuestions: 10, // Default assumption
              timeSpent: 0 // Default assumption
            });
          }
        });
        
        return Array.from(userScoresMap.values()).sort((a: any, b: any) => b.score - a.score);
      }
      
      return data || [];
    },
    staleTime: 1 * 60 * 1000, // Reduced to 1 minute for more frequent updates
    gcTime: 3 * 60 * 1000, // Reduced to 3 minutes 
    refetchInterval: 2 * 60 * 1000, // Reduced to 2 minutes for better freshness
    refetchOnWindowFocus: false, // Don't refetch on window focus for better performance
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
