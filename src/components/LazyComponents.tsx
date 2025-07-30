import { lazy } from 'react';

// Lazy load heavy components to improve initial load time
export const LazyLeaderboard = lazy(() => import('./Leaderboard').then(module => ({ default: module.Leaderboard })));
export const LazyEnhancedAnalytics = lazy(() => import('./EnhancedAnalytics').then(module => ({ default: module.EnhancedAnalytics })));
export const LazyUserManagement = lazy(() => import('./UserManagement').then(module => ({ default: module.UserManagement })));
export const LazyCredentialManagement = lazy(() => import('./CredentialManagement').then(module => ({ default: module.CredentialManagement })));
export const LazyAllQuizResults = lazy(() => import('./AllQuizResults').then(module => ({ default: module.AllQuizResults })));

// Fallback component for lazy loading
export const LazyFallback: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center py-12">
    <div className="relative">
      {/* Optimized loading spinner */}
      <div className="w-8 h-8 border-2 border-gray-600 rounded-full animate-spin"></div>
      <div className="absolute inset-0 w-8 h-8 border-2 border-transparent border-t-blue-500 rounded-full animate-spin" 
           style={{ animationDuration: '0.6s' }}></div>
    </div>
    <span className="ml-3 text-gray-400 font-medium">{text}</span>
  </div>
);
