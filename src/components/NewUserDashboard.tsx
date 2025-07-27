import React, { useState } from 'react';
import { Quiz, QuizAttempt } from '../types';
import { DashboardLayout } from './dashboard/DashboardLayout';
import { RecentAttempts } from './dashboard/RecentAttempts';
import { PerformanceAnalysis } from './dashboard/PerformanceAnalysis';
import { Leaderboards } from './dashboard/Leaderboards';
import { QuizBrowser } from './dashboard/QuizBrowser';

interface NewUserDashboardProps {
  onTakeQuiz?: (quiz: Quiz) => void;
  onViewResults: (attempt: QuizAttempt) => void;
}

export const NewUserDashboard: React.FC<NewUserDashboardProps> = ({
  onTakeQuiz,
  onViewResults,
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'performance' | 'leaderboard' | 'browse'>('recent');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'recent':
        return <RecentAttempts onViewResults={onViewResults} />;
      case 'browse':
        return <QuizBrowser onTakeQuiz={onTakeQuiz} />;
      case 'performance':
        return <PerformanceAnalysis />;
      case 'leaderboard':
        return <Leaderboards />;
      default:
        return <RecentAttempts onViewResults={onViewResults} />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderTabContent()}
    </DashboardLayout>
  );
};
