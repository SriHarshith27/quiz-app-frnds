import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { QuizCreator } from './components/QuizCreator';
import { QuizTaker } from './components/QuizTaker';
import { QuizResults } from './components/QuizResults';
import { CSVUploader } from './components/CSVUploader';
import { Quiz, QuizAttempt } from './types';

type AppState = 'dashboard' | 'create-quiz' | 'take-quiz' | 'upload-csv' | 'view-results';

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

  const handleCreateQuiz = () => setCurrentState('create-quiz');
  const handleTakeQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setCurrentState('take-quiz');
  };
  const handleUploadCSV = () => setCurrentState('upload-csv');
  const handleViewResults = (attempt: QuizAttempt) => {
    setSelectedAttemptId(attempt.id);
    setCurrentState('view-results');
  };
  const handleBackToDashboard = () => {
    setCurrentState('dashboard');
    setSelectedQuiz(null);
    setSelectedAttemptId(null);
  };
  const handleQuizComplete = (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setCurrentState('view-results');
  };

  const getTitle = () => {
    switch (currentState) {
      case 'create-quiz': return 'Create New Quiz';
      case 'take-quiz': return selectedQuiz?.title || 'Take Quiz';
      case 'upload-csv': return 'Upload CSV Questions';
      case 'view-results': return 'Quiz Results';
      default: return isAdmin ? 'Admin Dashboard' : 'Dashboard';
    }
  };

  return (
    <Layout title={getTitle()}>
      {currentState === 'dashboard' && (
        <>
          {isAdmin ? (
            <AdminDashboard
              onCreateQuiz={handleCreateQuiz}
              onUploadCSV={handleUploadCSV}
              onViewResults={handleViewResults}
            />
          ) : (
            <UserDashboard
              onTakeQuiz={handleTakeQuiz}
              onViewResults={handleViewResults}
            />
          )}
        </>
      )}
      
      {currentState === 'create-quiz' && isAdmin && (
        <QuizCreator
          onBack={handleBackToDashboard}
          onSave={handleBackToDashboard}
        />
      )}
      
      {currentState === 'take-quiz' && selectedQuiz && (
        <QuizTaker
          quiz={selectedQuiz}
          onBack={handleBackToDashboard}
          onComplete={handleQuizComplete}
        />
      )}
      
      {currentState === 'upload-csv' && isAdmin && (
        <CSVUploader
          onBack={handleBackToDashboard}
          onSave={handleBackToDashboard}
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