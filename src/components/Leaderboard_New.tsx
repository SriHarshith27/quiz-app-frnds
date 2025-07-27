import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Crown, Target, Clock, BookOpen, TrendingUp, Filter, Users } from 'lucide-react';
import { useLeaderboard, useQuizzes, useUsers } from '../hooks/useQueries';
import { User, QuizAttempt, Quiz } from '../types';

interface LeaderboardEntry {
  user: User;
  totalQuizzes: number;
  totalScore: number;
  totalQuestions: number;
  averageScore: number;
  averagePercentage: number;
  bestScore: number;
  bestPercentage: number;
  totalTimeSpent: number;
  averageTime: number;
  recentActivity: string;
  rank: number;
}

interface QuizLeaderboard {
  quiz: Quiz;
  topPerformers: {
    user: User;
    attempt: QuizAttempt;
    percentage: number;
    rank: number;
  }[];
}

export const Leaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overall' | 'quiz-specific'>('overall');
  const [timeFilter, setTimeFilter] = useState<'all-time' | 'this-month' | 'this-week'>('all-time');

  // Use React Query hooks
  const { data: leaderboardData, isLoading: leaderboardLoading, error: leaderboardError } = useLeaderboard();
  const { data: quizzes, isLoading: quizzesLoading } = useQuizzes();
  const { data: users, isLoading: usersLoading } = useUsers();

  const loading = leaderboardLoading || quizzesLoading || usersLoading;

  // Process leaderboard data
  const overallLeaderboard = useMemo(() => {
    if (!leaderboardData || !users) return [];

    return leaderboardData.map((entry: any, index: number) => ({
      ...entry,
      rank: index + 1,
      user: users.find((u: any) => u.id === entry.userId) || { 
        id: entry.userId, 
        username: entry.username || 'Unknown User',
        email: '',
        role: 'user'
      }
    }));
  }, [leaderboardData, users]);

  // Process quiz-specific leaderboards
  const quizLeaderboards = useMemo(() => {
    if (!quizzes || !leaderboardData) return [];

    return quizzes.slice(0, 10).map((quiz: any) => {
      const quizAttempts = leaderboardData
        .filter((entry: any) => entry.quizId === quiz.id)
        .slice(0, 5) // Top 5 for each quiz
        .map((entry: any, index: number) => ({
          user: users?.find((u: any) => u.id === entry.userId) || {
            id: entry.userId,
            username: entry.username || 'Unknown User',
            email: '',
            role: 'user'
          },
          attempt: {
            id: entry.attemptId || `${entry.userId}-${quiz.id}`,
            quiz_id: quiz.id,
            user_id: entry.userId,
            score: entry.score,
            total_questions: entry.totalQuestions || 10,
            time_taken: entry.timeSpent || 0,
            completed_at: entry.completedAt || new Date().toISOString()
          },
          percentage: entry.score,
          rank: index + 1
        }));

      return {
        quiz,
        topPerformers: quizAttempts
      };
    });
  }, [quizzes, leaderboardData, users]);

  const getTimeFilterDate = () => {
    const now = new Date();
    switch (timeFilter) {
      case 'this-week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return weekAgo.toISOString();
      case 'this-month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return monthAgo.toISOString();
      default:
        return null;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-400">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-600';
      default:
        return 'bg-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (leaderboardError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Leaderboard</h2>
          <p className="text-gray-400">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
            🏆 Leaderboard
          </h1>
          <p className="text-gray-400">See how you stack up against other quiz masters!</p>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Tab Selection */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('overall')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'overall'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Overall Rankings
              </button>
              <button
                onClick={() => setActiveTab('quiz-specific')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'quiz-specific'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Quiz-Specific
              </button>
            </div>

            {/* Time Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all-time">All Time</option>
                <option value="this-month">This Month</option>
                <option value="this-week">This Week</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overall Leaderboard */}
        {activeTab === 'overall' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Overall Rankings
              </h2>
              <p className="text-gray-400 text-sm mt-1">Based on best quiz performance</p>
            </div>

            <div className="divide-y divide-gray-700">
              {overallLeaderboard.slice(0, 50).map((entry) => (
                <motion.div
                  key={entry.user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: entry.rank * 0.05 }}
                  className={`p-4 hover:bg-gray-750 transition-colors ${
                    entry.rank <= 3 ? 'bg-gray-750' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12">
                        {getRankIcon(entry.rank)}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-white">{entry.user.username}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            Score: {entry.score}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRankBadgeColor(entry.rank)} text-white`}>
                        #{entry.rank}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {overallLeaderboard.length === 0 && (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No leaderboard data available yet.</p>
                <p className="text-gray-500 text-sm mt-2">Complete some quizzes to see rankings!</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Quiz-Specific Leaderboards */}
        {activeTab === 'quiz-specific' && (
          <div className="space-y-8">
            {quizLeaderboards.map((quizLeaderboard) => (
              <motion.div
                key={quizLeaderboard.quiz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    {quizLeaderboard.quiz.title}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Category: {quizLeaderboard.quiz.category || 'General'}
                  </p>
                </div>

                <div className="divide-y divide-gray-700">
                  {quizLeaderboard.topPerformers.map((performer) => (
                    <div
                      key={`${performer.user.id}-${quizLeaderboard.quiz.id}`}
                      className="p-4 hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8">
                            {getRankIcon(performer.rank)}
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-white">{performer.user.username}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {performer.percentage.toFixed(1)}%
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.round(performer.attempt.time_taken / 60)}m
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            {performer.attempt.score}/{performer.attempt.total_questions}
                          </div>
                          <div className="text-sm text-gray-400">
                            {new Date(performer.attempt.completed_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {quizLeaderboard.topPerformers.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-gray-400">No attempts yet for this quiz.</p>
                  </div>
                )}
              </motion.div>
            ))}

            {quizLeaderboards.length === 0 && (
              <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No quiz data available.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
