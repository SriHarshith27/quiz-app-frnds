import { useState, useEffect } from 'react';
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

type AppState = 'login' | 'reset-password' | 'dashboard' | 'take-quiz' | 'view-results';

function AppContent() {
  const { user, loading, isAdmin } = useAuth();
  const [currentState, setCurrentState] = useState<AppState>('login');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  // Enable intelligent prefetching for better performance
  usePrefetch();

  // Check URL for reset password route
  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    if (path === '/reset-password' || hash.includes('type=recovery')) {
      setCurrentState('reset-password');
    } else if (user) {
      setCurrentState('dashboard');
    } else {
      setCurrentState('login');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <AppleLoading size="lg" text="Initializing app..." />
      </div>
    );
  }

  // Handle reset password state
  if (currentState === 'reset-password') {
    return <ResetPassword onBack={() => setCurrentState('login')} />;
  }

  if (!user) {
    return <LoginForm />;
  }

  const handleTakeQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setCurrentState('take-quiz');
  };
  const handleViewResults = (attempt: QuizAttempt) => {
    setSelectedAttemptId(attempt.id);
    setCurrentState('view-results');
  };
  const handleBackToDashboard = () => {
    setCurrentState('dashboard');
    setSelectedQuiz(null);
    setSelectedAttemptId(null);
  };
  const handleQuizComplete = (attemptId?: string) => {
    if (attemptId) {
      setSelectedAttemptId(attemptId);
      setCurrentState('view-results');
    }
  };

  const getTitle = () => {
    switch (currentState) {
      case 'take-quiz': return selectedQuiz?.title || 'Take Quiz';
      case 'view-results': return 'Quiz Results';
      default: return isAdmin ? 'Admin Dashboard' : 'Dashboard';
    }
  };

  return (
    <Layout title={getTitle()}>
      {currentState === 'dashboard' && (
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
      
      {currentState === 'take-quiz' && selectedQuiz && (
        <QuizTaker
          quiz={selectedQuiz}
          onBack={handleBackToDashboard}
          onComplete={handleQuizComplete}
        />
      )}
      
      {currentState === 'view-results' && selectedAttemptId && (
        <QuizResults
          attemptId={selectedAttemptId}
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