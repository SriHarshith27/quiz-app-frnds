import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { NewUserDashboard } from './components/NewUserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { QuizTaker } from './components/QuizTaker';
import { QuizResults } from './components/QuizResults';
import { Quiz, QuizAttempt } from './types';

type AppState = 'dashboard' | 'take-quiz' | 'view-results';

function AppContent() {
  const { user, loading, isAdmin } = useAuth();
  const [currentState, setCurrentState] = useState<AppState>('dashboard');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;