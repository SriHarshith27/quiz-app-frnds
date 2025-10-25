// src/hooks/usePrefetch.ts

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../hooks/useQueries';
import { supabase } from '../lib/supabase';

// Prefetch commonly used data to make the app feel instant
export const usePrefetch = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const prefetchInitialData = async () => {
      // Prefetch quizzes data - this is the most important initial data
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
        staleTime: 5 * 60 * 1000, // Quizzes can have a longer staleTime
      });
    };

    prefetchInitialData();

    // Set up intelligent prefetching based on user interactions
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Prefetch leaderboard data when user hovers over leaderboard-related elements
      if (target.textContent?.toLowerCase().includes('leaderboard') || 
          target.classList?.contains('leaderboard-trigger')) {
        queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.leaderboard,
          queryFn: async () => {
            const { data, error } = await supabase.rpc('get_leaderboard');
            if (error) throw error;
            return data;
          },
          staleTime: 1 * 60 * 1000, // Leaderboard data can be more dynamic
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