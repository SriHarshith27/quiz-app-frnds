import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create a client with optimized default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 2 minutes by default (reduced from 5 minutes)
      staleTime: 2 * 60 * 1000,
      // Keep data in cache for 5 minutes (reduced from 10 minutes)
      gcTime: 5 * 60 * 1000,
      // Retry failed requests 2 times (reduced from 3)
      retry: 2,
      // Don't refetch on window focus for better UX
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Add network mode for better offline handling
      networkMode: 'online',
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      // Set network mode for mutations
      networkMode: 'online',
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show React Query DevTools in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};
