import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Trophy, Clock, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserAttempts } from '../../hooks/useQueries';
import { QuizAttempt } from '../../types';

interface RecentAttemptsProps {
  onViewResults: (attempt: QuizAttempt) => void;
}

export const RecentAttempts: React.FC<RecentAttemptsProps> = ({ onViewResults }) => {
  const { user } = useAuth();
  const { data: userAttempts, isLoading, error } = useUserAttempts(user?.id || '');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-6">Recent Quiz Attempts</h2>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-6 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-6 bg-gray-600 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-600 rounded w-1/4"></div>
                </div>
                <div className="h-8 bg-gray-600 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Recent Quiz Attempts</h2>
        <p className="text-red-400">Error loading your attempts. Please try again later.</p>
      </div>
    );
  }

  if (!userAttempts || userAttempts.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-6">Recent Quiz Attempts</h2>
        <div className="bg-gray-700/30 rounded-lg p-8">
          <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No attempts yet</h3>
          <p className="text-gray-400">Start taking quizzes to see your recent attempts here!</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return TrendingUp;
    if (score >= 60) return Trophy;
    return TrendingDown;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Recent Quiz Attempts</h2>
        <p className="text-gray-400">{userAttempts.length} total attempts</p>
      </div>

      <div className="space-y-4">
        {userAttempts.map((attempt: any, index: number) => {
          // Safely calculate score percentage
          const totalQuestions = attempt.total_questions || 10;
          const score = attempt.score || 0;
          const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
          const ScoreIcon = getScoreIcon(percentage);
          
          return (
            <motion.div
              key={attempt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-700/50 hover:bg-gray-700/70 rounded-lg p-6 transition-all cursor-pointer group"
              onClick={() => onViewResults(attempt)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {attempt.quizzes?.title || 'Quiz'}
                    </h3>
                    <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full text-xs">
                      {attempt.quizzes?.category || 'General'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(attempt.completed_at)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{attempt.time_taken || 'N/A'} minutes</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(percentage)}`}>
                      {percentage}%
                    </div>
                    <div className="text-xs text-gray-400">
                      {score}/{totalQuestions} correct
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <ScoreIcon className={`w-6 h-6 ${getScoreColor(percentage)}`} />
                    <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {userAttempts.length > 10 && (
        <div className="text-center">
          <button className="text-blue-400 hover:text-blue-300 transition-colors">
            View All Attempts
          </button>
        </div>
      )}
    </div>
  );
};
