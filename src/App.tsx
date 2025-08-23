import { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { ResetPassword } from './components/ResetPassword';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppleLoading } from './components/AppleLoading';
import { NewUserDashboard } from './components/NewUserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { QuizTaker } from './components/QuizTaker';
import { QuizResults } from './components/QuizResults';
import { usePrefetch } from './hooks/usePrefetch';
import { Quiz, QuizAttempt } from './types';

type View = 'dashboard' | 'take-quiz' | 'view-results';

interface AppState {
  currentView: View;
  selectedQuiz: Quiz | null;
  selectedAttemptId: string | null;
}

function AppContent() {
  const { user, loading, isAdmin, error } = useAuth();
  const [appState, setAppState] = useState<AppState>({
    currentView: 'dashboard',
    selectedQuiz: null,
    selectedAttemptId: null
  });

  usePrefetch();

  // Handle URL-based routing for password reset
  useEffect(() => {
    const handlePasswordReset = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      
      if (path === '/reset-password' || hash.includes('type=recovery')) {
        // Let the component handle this case
        return;
      }
    };

    if (!user && !loading) {
      handlePasswordReset();
    }
  }, [user, loading]);

  // Reset app state when user logs out
  useEffect(() => {
    if (!user && !loading) {
      setAppState({
        currentView: 'dashboard',
        selectedQuiz: null,
        selectedAttemptId: null
      });
    }
  }, [user, loading]);

  const handleTakeQuiz = useCallback((quiz: Quiz) => {
    setAppState({
      currentView: 'take-quiz',
      selectedQuiz: quiz,
      selectedAttemptId: null
    });
  }, []);

  const handleViewResults = useCallback((attempt: QuizAttempt) => {
    setAppState({
      currentView: 'view-results',
      selectedQuiz: null,
      selectedAttemptId: attempt.id
    });
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setAppState({
      currentView: 'dashboard',
      selectedQuiz: null,
      selectedAttemptId: null
    });
  }, []);

  const handleQuizComplete = useCallback((attemptId?: string) => {
    if (attemptId) {
      setAppState({
        currentView: 'view-results',
        selectedQuiz: null,
        selectedAttemptId: attemptId
      });
    } else {
      handleBackToDashboard();
    }
  }, [handleBackToDashboard]);

  const handlePasswordResetBack = useCallback(() => {
    window.location.href = '/';
  }, []);
  
  const getTitle = useCallback((): string => {
    switch (appState.currentView) {
      case 'take-quiz': 
        return appState.selectedQuiz?.title || 'Take Quiz';
      case 'view-results': 
        return 'Quiz Results';
      default: 
        return isAdmin ? 'Admin Dashboard' : 'Dashboard';
    }
  }, [appState.currentView, appState.selectedQuiz?.title, isAdmin]);

  // Show loading screen while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <AppleLoading size="lg" text="Initializing app..." />
      </div>
    );
  }

  // Handle unauthenticated users
  if (!user) {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // Show password reset form if on reset password route
    if (path === '/reset-password' || hash.includes('type=recovery')) {
      return (
        <ResetPassword onBack={handlePasswordResetBack} />
      );
    }
    
    // Show login form
    return <LoginForm />;
  }

  // Show error state if there's an auth error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-red-400 text-lg font-semibold mb-2">
            Authentication Error
          </h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render authenticated user interface
  return (
    <Layout title={getTitle()}>
      {appState.currentView === 'dashboard' && (
        <>
          {isAdmin ? (
            <AdminDashboard />
          ) : (
            <NewUserDashboard
              onTakeQuiz={handleTakeQuiz}
              onViewResults={handleViewResults}
            />
          )}
        </>
      )}
      
      {appState.currentView === 'take-quiz' && appState.selectedQuiz && (
        <QuizTaker
          quiz={appState.selectedQuiz}
          onBack={handleBackToDashboard}
          onComplete={handleQuizComplete}
        />
      )}
      
      {appState.currentView === 'view-results' && appState.selectedAttemptId && (
        <QuizResults
          attemptId={appState.selectedAttemptId}
          onBack={handleBackToDashboard}
        />
      )}
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;