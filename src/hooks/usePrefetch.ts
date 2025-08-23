import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../hooks/useQueries';
import { supabase } from '../lib/supabase';

// Optimized prefetch hook - only prefetch critical data to improve initial load time
export const usePrefetch = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const prefetchCriticalData = async () => {
      try {
        // Only prefetch quizzes data immediately - this is the most critical data
        await queryClient.prefetchQuery({
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
              .order('created_at', { ascending: false })
              .limit(20); // Limit to recent quizzes for faster loading
            
            if (error) throw error;
            return data;
          },
          staleTime: 2 * 60 * 1000, // Reduced from 15 minutes
        });

        // Defer less critical data prefetching
        setTimeout(() => {
          // Prefetch users data after initial load is complete
          queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.users,
            queryFn: async () => {
              const { data, error } = await supabase
                .from('users')
                .select('id, username, email, role, created_at')
                .order('created_at', { ascending: false })
                .limit(50); // Limit to recent users
              
              if (error) throw error;
              return data;
            },
            staleTime: 2 * 60 * 1000, // Reduced from 5 minutes
          });
        }, 2000); // Wait 2 seconds before prefetching users

        // Don't prefetch leaderboard on initial load - it's expensive and not immediately needed
        // Users can trigger this when they navigate to leaderboard
      } catch (error) {
        console.warn('Prefetch failed:', error);
        // Don't throw error - prefetch failures shouldn't break the app
      }
    };

    // Prefetch critical data when the component mounts
    prefetchCriticalData();

    // Set up intelligent prefetching for leaderboard when user shows intent
    const handleLeaderboardPrefetch = () => {
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
            .limit(20); // Reduced from 50 for faster loading
          
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
        staleTime: 1 * 60 * 1000, // 1 minute for leaderboard data
      });
    };

    // Intelligent prefetching based on user interactions
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Prefetch leaderboard data when user hovers over leaderboard-related elements
      if (target.textContent?.toLowerCase().includes('leaderboard') || 
          target.classList?.contains('leaderboard-trigger') ||
          target.closest('[data-prefetch="leaderboard"]')) {
        handleLeaderboardPrefetch();
      }
    };

    // Add hover listeners for intelligent prefetching (debounced)
    let prefetchTimeout: NodeJS.Timeout | null = null;
    const debouncedMouseEnter = (e: MouseEvent) => {
      if (prefetchTimeout) clearTimeout(prefetchTimeout);
      prefetchTimeout = setTimeout(() => handleMouseEnter(e), 300);
    };

    document.addEventListener('mouseenter', debouncedMouseEnter, true);

    return () => {
      document.removeEventListener('mouseenter', debouncedMouseEnter, true);
      if (prefetchTimeout) clearTimeout(prefetchTimeout);
    };
  }, [queryClient]);
};