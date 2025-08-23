import React, { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { QuizCreator } from './QuizCreator';
import { CSVUploader } from './CSVUploader';
import { QuizResults } from './QuizResults';
import { 
  LazyLeaderboard,
  LazyEnhancedAnalytics,
  LazyUserManagement,
  LazyCredentialManagement,
  LazyAllQuizResults,
  LazyFallback
} from './LazyComponents';

type ActiveView = 'Analytics' | 'Create Quiz' | 'Upload CSV' | 'All Results' | 'Leaderboard' | 'Credentials' | 'User Management' | 'View Result';

const AdminDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('Analytics');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const tabs: ActiveView[] = ['Analytics', 'Create Quiz', 'Upload CSV', 'All Results', 'Leaderboard', 'Credentials', 'User Management'];

  const handleQuizCreated = () => {
    // Placeholder for quiz creation success handling
    console.log('Quiz created successfully');
    // Could switch to Analytics tab or show success message
    setActiveView('Analytics');
  };

  const handleUploadSuccess = () => {
    // Placeholder for CSV upload success handling
    console.log('CSV upload successful');
    // Could switch to Analytics tab or show success message
    setActiveView('Analytics');
  };

  const handleViewAttempt = (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setActiveView('View Result');
  };

  const handleBackFromResult = () => {
    setSelectedAttemptId(null);
    setActiveView('All Results');
  };

  const renderActiveComponent = () => {
    switch (activeView) {
      case 'Analytics':
        return (
          <Suspense fallback={<LazyFallback text="Loading Analytics..." />}>
            <LazyEnhancedAnalytics />
          </Suspense>
        );
      case 'Create Quiz':
        return (
          <QuizCreator 
            onBack={() => setActiveView('Analytics')}
            onSave={handleQuizCreated}
          />
        );
      case 'Upload CSV':
        return (
          <CSVUploader 
            onBack={() => setActiveView('Analytics')}
            onSave={handleUploadSuccess}
          />
        );
      case 'All Results':
        return (
          <Suspense fallback={<LazyFallback text="Loading Results..." />}>
            <LazyAllQuizResults 
              onViewAttempt={handleViewAttempt}
            />
          </Suspense>
        );
      case 'Leaderboard':
        return (
          <Suspense fallback={<LazyFallback text="Loading Leaderboard..." />}>
            <LazyLeaderboard />
          </Suspense>
        );
      case 'Credentials':
        return (
          <Suspense fallback={<LazyFallback text="Loading Credentials..." />}>
            <LazyCredentialManagement />
          </Suspense>
        );
      case 'User Management':
        return (
          <Suspense fallback={<LazyFallback text="Loading User Management..." />}>
            <LazyUserManagement />
          </Suspense>
        );
      case 'View Result':
        if (!selectedAttemptId) {
          return (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No attempt selected</p>
              <button
                onClick={() => setActiveView('All Results')}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Back to All Results
              </button>
            </div>
          );
        }
        return (
          <QuizResults 
            attemptId={selectedAttemptId}
            onBack={handleBackFromResult}
          />
        );
      default:
        return (
          <Suspense fallback={<LazyFallback text="Loading..." />}>
            <LazyEnhancedAnalytics />
          </Suspense>
        );
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Tabbed Navigation */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <motion.button
                key={tab}
                onClick={() => setActiveView(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeView === tab
                    ? 'border-indigo-400 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {tab}
              </motion.button>
            ))}
          </nav>
        </div>

        {/* Active Component */}
        <div className="mt-6">
          {renderActiveComponent()}
        </div>
      </div>
    </div>
  );
};

export { AdminDashboard };
export default AdminDashboard;
