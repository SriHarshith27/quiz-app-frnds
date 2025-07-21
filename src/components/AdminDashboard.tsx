import React, { useState } from 'react';
import { EnhancedAnalytics } from './EnhancedAnalytics';
import { QuizCreator } from './QuizCreator';
import { CSVUploader } from './CSVUploader';
import { AllQuizResults } from './AllQuizResults';
import { QuizResults } from './QuizResults';
import { Leaderboard } from './Leaderboard';

type ActiveView = 'Analytics' | 'Create Quiz' | 'Upload CSV' | 'All Results' | 'Leaderboard' | 'View Result';

const AdminDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('Analytics');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const tabs: ActiveView[] = ['Analytics', 'Create Quiz', 'Upload CSV', 'All Results', 'Leaderboard'];

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
        return <EnhancedAnalytics />;
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
          <AllQuizResults 
            onViewAttempt={handleViewAttempt}
          />
        );
      case 'Leaderboard':
        return <Leaderboard />;
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
        return <EnhancedAnalytics />;
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Tabbed Navigation */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveView(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeView === tab
                    ? 'border-indigo-400 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
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
