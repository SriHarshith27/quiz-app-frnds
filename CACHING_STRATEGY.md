# Data Fetching and Caching Strategy

This document outlines the data fetching and caching strategy implemented using TanStack Query (React Query) for optimal performance and user experience.

## Overview

The application uses **TanStack Query** (formerly React Query) as a powerful data-fetching library that provides:
- Intelligent caching with automatic background updates
- Optimistic updates for mutations
- Automatic retry mechanisms
- Request deduplication
- Real-time data synchronization

## Architecture

### Query Client Configuration (`src/lib/queryClient.tsx`)

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes
      retry: 3,                       // Retry failed requests 3 times
      refetchOnWindowFocus: false,    // Don't refetch on window focus
      refetchOnReconnect: true,       // Refetch on reconnect
    },
  },
});
```

### Custom Hooks (`src/hooks/useQueries.ts`)

The application provides specialized hooks for different data types with optimized caching strategies:

## Caching Strategies by Content Type

### 1. Static Content (Long Cache Times)
**Quiz Data**: 15 minutes cache
- Quizzes change infrequently
- Individual quiz details are very stable
- Background updates ensure freshness

```typescript
export const useQuiz = (quizId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.quiz(quizId),
    staleTime: 15 * 60 * 1000, // 15 minutes
    // ... query function
  });
};
```

### 2. Semi-Dynamic Content (Medium Cache Times)
**Quiz Lists**: 10 minutes cache
- Quiz availability changes occasionally
- New quizzes are added periodically

**User Profiles**: 5 minutes cache
- User information is relatively stable
- Changes are infrequent

### 3. Dynamic Content (Short Cache Times)
**User Attempts**: 1 minute cache
- User progress changes frequently
- Recent activity needs to be current

**Leaderboards**: 30 seconds cache with auto-refetch
- Highly competitive data that changes often
- Auto-refetches every minute for real-time feel

```typescript
export const useLeaderboard = () => {
  return useQuery({
    queryKey: QUERY_KEYS.leaderboard,
    staleTime: 30 * 1000,           // 30 seconds
    refetchInterval: 60 * 1000,     // Auto-refetch every minute
    // ... query function
  });
};
```

## Smart Cache Invalidation

### Optimistic Updates
When users perform actions, the cache is immediately updated for instant feedback:

```typescript
export const useSubmitQuizAttempt = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attemptData) => {
      // Submit to Supabase
    },
    onSuccess: (data) => {
      // Invalidate related queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userAttempts(data.user_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaderboard });
    },
  });
};
```

### Selective Cache Updates
Instead of invalidating entire datasets, we update specific cache entries:

```typescript
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    onSuccess: (data) => {
      // Directly update the cache for immediate UI feedback
      queryClient.setQueryData(QUERY_KEYS.user(data.id), data);
      // Only invalidate the users list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
};
```

## Query Key Structure

Hierarchical query keys enable precise cache management:

```typescript
export const QUERY_KEYS = {
  users: ['users'],
  user: (id: string) => ['users', id],
  quizzes: ['quizzes'],
  quiz: (id: string) => ['quizzes', id],
  userQuizzes: (userId: string) => ['quizzes', 'user', userId],
  // ... more keys
};
```

This structure allows for:
- Invalidating all user-related queries: `['users']`
- Invalidating specific user: `['users', userId]`
- Invalidating all quiz-related queries: `['quizzes']`

## Performance Benefits

### 1. Reduced Network Requests
- **Request Deduplication**: Multiple components requesting the same data share a single request
- **Background Refetching**: Data is updated in the background without blocking the UI
- **Intelligent Caching**: Recently fetched data is served from cache

### 2. Better User Experience
- **Instant Loading**: Cached data displays immediately while fresh data loads in background
- **Optimistic Updates**: UI updates immediately on user actions
- **Offline Support**: Cached data remains available when offline

### 3. Reduced Server Load
- **Fewer Database Queries**: Cached data reduces load on Supabase
- **Smart Invalidation**: Only necessary data is refetched
- **Batch Operations**: Related updates are batched together

## Development Tools

### React Query DevTools
Available in development mode for debugging:
- View all cached queries
- Inspect query states and data
- Manually trigger refetches
- Monitor network activity

Access via the React Query DevTools panel in the browser.

## Best Practices

### 1. Component Integration
```typescript
// ✅ Good: Use the custom hooks
const { data: quizzes, isLoading, error } = useQuizzes();

// ❌ Avoid: Direct Supabase calls in components
const [quizzes, setQuizzes] = useState([]);
useEffect(() => {
  supabase.from('quizzes').select('*').then(/* ... */);
}, []);
```

### 2. Error Handling
```typescript
const { data, isLoading, error } = useQuizzes();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;

return <QuizList quizzes={data} />;
```

### 3. Mutation Feedback
```typescript
const { mutate, isPending, error } = useCreateQuiz();

const handleSubmit = (quizData) => {
  mutate(quizData, {
    onSuccess: () => {
      toast.success('Quiz created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create quiz: ${error.message}`);
    }
  });
};
```

## Migration Notes

### From Direct Supabase Calls
Components have been gradually migrated from direct `supabase.from()` calls to use the custom React Query hooks:

**Before:**
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    const { data } = await supabase.from('quizzes').select('*');
    setData(data);
    setLoading(false);
  };
  loadData();
}, []);
```

**After:**
```typescript
const { data, isLoading } = useQuizzes();
```

This migration provides:
- Automatic caching and background updates
- Better error handling
- Reduced boilerplate code
- Improved performance
- Better developer experience
