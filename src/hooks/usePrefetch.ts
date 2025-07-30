import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../hooks/useQueries';
import { supabase } from '../lib/supabase';

// Prefetch commonly used data to make the app feel instant
export const usePrefetch = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const prefetchData = async () => {
      // Prefetch users data (commonly used across the app)
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.users,
        queryFn: async () => {
          const { data, error } = await supabase
            .from('users')
            .select('id, username, email, role, created_at')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          return data;
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch quizzes data
      queryClient.prefetchQuery({
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
        staleTime: 15 * 60 * 1000,
      });

      // Prefetch leaderboard data (after a small delay to prioritize other data)
      setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.leaderboard,
          queryFn: async () => {
            const { data, error } = await supabase
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
            
            if (error) throw error;
            
            // Group by user and calculate best scores efficiently
            const userScoresMap = new Map();
            data.forEach((attempt: any) => {
              const userId = attempt.user_id;
              const currentBest = userScoresMap.get(userId);
              
              if (!currentBest || currentBest.score < attempt.score) {
                userScoresMap.set(userId, {
                  userId,
                  username: attempt.users.username,
                  score: attempt.score,
                  quizId: attempt.quiz_id,
                  completedAt: attempt.completed_at,
                  totalQuestions: 10,
                  timeSpent: 0
                });
              }
            });
            
            return Array.from(userScoresMap.values()).sort((a: any, b: any) => b.score - a.score);
          },
          staleTime: 2 * 60 * 1000,
        });
      }, 1000);
    };

    // Prefetch data when the component mounts
    prefetchData();

    // Set up intelligent prefetching based on user interactions
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Prefetch leaderboard data when user hovers over leaderboard-related elements
      if (target.textContent?.toLowerCase().includes('leaderboard') || 
          target.classList.contains('leaderboard-trigger')) {
        queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.leaderboard,
          queryFn: async () => {
            const { data, error } = await supabase
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
            
            if (error) throw error;
            
            const userScoresMap = new Map();
            data.forEach((attempt: any) => {
              const userId = attempt.user_id;
              const currentBest = userScoresMap.get(userId);
              
              if (!currentBest || currentBest.score < attempt.score) {
                userScoresMap.set(userId, {
                  userId,
                  username: attempt.users.username,
                  score: attempt.score,
                  quizId: attempt.quiz_id,
                  completedAt: attempt.completed_at,
                  totalQuestions: 10,
                  timeSpent: 0
                });
              }
            });
            
            return Array.from(userScoresMap.values()).sort((a: any, b: any) => b.score - a.score);
          },
          staleTime: 2 * 60 * 1000,
        });
      }
    };

    // Add hover listeners for intelligent prefetching
    document.addEventListener('mouseenter', handleMouseEnter, true);

    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true);
    };
  }, [queryClient]);
};
