import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Crown, Target, Clock, BookOpen, TrendingUp, Filter, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [quizLeaderboards, setQuizLeaderboards] = useState<QuizLeaderboard[]>([]);
  const [activeTab, setActiveTab] = useState<'overall' | 'quiz-specific'>('overall');
  const [timeFilter, setTimeFilter] = useState<'all-time' | 'this-month' | 'this-week'>('all-time');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboardData();
  }, [timeFilter]);

  const getTimeFilterDate = () => {
    const now = new Date();
    switch (timeFilter) {
      case 'this-week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return weekAgo.toISOString();
      case 'this-month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        return monthAgo.toISOString();
      default:
        return null;
    }
  };

  const loadLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const timeFilterDate = getTimeFilterDate();

      // Load all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'user')
        .order('username');

      if (usersError) throw usersError;

      // Load quiz attempts with time filter
      let attemptsQuery = supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes (
            id,
            title,
            category,
            description
          )
        `);

      if (timeFilterDate) {
        attemptsQuery = attemptsQuery.gte('completed_at', timeFilterDate);
      }

      const { data: attemptsData, error: attemptsError } = await attemptsQuery
        .order('completed_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Load all quizzes
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .order('title');

      if (quizzesError) throw quizzesError;

      // Process overall leaderboard
      const leaderboardEntries: LeaderboardEntry[] = [];

      for (const user of usersData || []) {
        const userAttempts = attemptsData?.filter(attempt => attempt.user_id === user.id) || [];
        
        if (userAttempts.length === 0) continue;

        const totalScore = userAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
        const totalQuestions = userAttempts.reduce((sum, attempt) => sum + attempt.total_questions, 0);
        const totalTimeSpent = userAttempts.reduce((sum, attempt) => sum + attempt.time_taken, 0);
        const averageScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;
        const averagePercentage = Math.round(averageScore * 100);
        
        const bestAttempt = userAttempts.reduce((best, attempt) => {
          const percentage = (attempt.score / attempt.total_questions) * 100;
          const bestPercentage = (best.score / best.total_questions) * 100;
          return percentage > bestPercentage ? attempt : best;
        });

        const bestPercentage = Math.round((bestAttempt.score / bestAttempt.total_questions) * 100);
        const averageTime = Math.round(totalTimeSpent / userAttempts.length);
        const recentActivity = userAttempts[0]?.completed_at || '';

        leaderboardEntries.push({
          user,
          totalQuizzes: userAttempts.length,
          totalScore,
          totalQuestions,
          averageScore,
          averagePercentage,
          bestScore: bestAttempt.score,
          bestPercentage,
          totalTimeSpent,
          averageTime,
          recentActivity,
          rank: 0 // Will be set after sorting
        });
      }

      // Sort and rank by average percentage
      leaderboardEntries.sort((a, b) => {
        if (b.averagePercentage !== a.averagePercentage) {
          return b.averagePercentage - a.averagePercentage;
        }
        return b.totalQuizzes - a.totalQuizzes; // Tie-breaker: more quizzes taken
      });

      leaderboardEntries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      setOverallLeaderboard(leaderboardEntries);

      // Process quiz-specific leaderboards
      const quizLeaderboards: QuizLeaderboard[] = [];

      for (const quiz of quizzesData || []) {
        const quizAttempts = attemptsData?.filter(attempt => attempt.quiz_id === quiz.id) || [];
        
        if (quizAttempts.length === 0) continue;

        // Get best attempt per user for this quiz
        const userBestAttempts = new Map();
        
        quizAttempts.forEach(attempt => {
          const userId = attempt.user_id;
          const percentage = (attempt.score / attempt.total_questions) * 100;
          
          if (!userBestAttempts.has(userId) || 
              percentage > (userBestAttempts.get(userId).score / userBestAttempts.get(userId).total_questions) * 100) {
            userBestAttempts.set(userId, attempt);
          }
        });

        // Convert to array and sort by percentage
        const topPerformers = Array.from(userBestAttempts.values())
          .map(attempt => {
            const user = usersData?.find(u => u.id === attempt.user_id);
            const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
            return {
              user,
              attempt,
              percentage,
              rank: 0
            };
          })
          .filter(entry => entry.user)
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 10); // Top 10 performers

        // Assign ranks
        topPerformers.forEach((performer, index) => {
          performer.rank = index + 1;
        });

        quizLeaderboards.push({
          quiz,
          topPerformers
        });
      }

      setQuizLeaderboards(quizLeaderboards);

    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Trophy className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <Award className="w-6 h-6 text-gray-500" />;
    }
  };

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
      case 2:
        return 'bg-gradient-to-r from-gray-400 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-amber-600 to-amber-700';
      default:
        return 'bg-gray-600';
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-xl p-6 text-center">
        <p className="text-red-400 mb-4">Error loading leaderboard</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button
          onClick={loadLeaderboardData}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
            <Trophy className="w-8 h-8 text-yellow-500 mr-3" />
            Leaderboard
          </h2>
          <p className="text-gray-400">Top performers across all quizzes</p>
        </div>
        
        {/* Time Filter */}
        <div className="flex items-center space-x-3">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as 'all-time' | 'this-month' | 'this-week')}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all-time">All Time</option>
            <option value="this-month">This Month</option>
            <option value="this-week">This Week</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overall')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overall'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Overall Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('quiz-specific')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'quiz-specific'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Quiz-Specific Rankings
          </button>
        </nav>
      </div>

      {/* Overall Leaderboard */}
      {activeTab === 'overall' && (
        <div className="space-y-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-blue-500" />
                <div>
                  <p className="text-lg font-bold text-white">{overallLeaderboard.length}</p>
                  <p className="text-gray-400 text-sm">Active Players</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <Target className="w-6 h-6 text-green-500" />
                <div>
                  <p className="text-lg font-bold text-white">
                    {overallLeaderboard.length > 0 
                      ? Math.round(overallLeaderboard.reduce((sum, entry) => sum + entry.averagePercentage, 0) / overallLeaderboard.length)
                      : 0}%
                  </p>
                  <p className="text-gray-400 text-sm">Avg Score</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-6 h-6 text-purple-500" />
                <div>
                  <p className="text-lg font-bold text-white">
                    {overallLeaderboard.reduce((sum, entry) => sum + entry.totalQuizzes, 0)}
                  </p>
                  <p className="text-gray-400 text-sm">Total Attempts</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center space-x-3">
                <Clock className="w-6 h-6 text-orange-500" />
                <div>
                  <p className="text-lg font-bold text-white">
                    {formatTime(Math.round(overallLeaderboard.reduce((sum, entry) => sum + entry.averageTime, 0) / Math.max(overallLeaderboard.length, 1)))}
                  </p>
                  <p className="text-gray-400 text-sm">Avg Time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Top Performers</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Player</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Average Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Best Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Quizzes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {overallLeaderboard.map((entry) => (
                    <motion.tr
                      key={entry.user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: entry.rank * 0.1 }}
                      className="hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {getRankIcon(entry.rank)}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getRankBgColor(entry.rank)}`}>
                            {entry.rank}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">
                              {entry.user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{entry.user.username}</div>
                            <div className="text-sm text-gray-400">{entry.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{entry.averagePercentage}%</div>
                        <div className="text-sm text-gray-400">{entry.totalScore}/{entry.totalQuestions}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-400">{entry.bestPercentage}%</div>
                        <div className="text-sm text-gray-400">{entry.bestScore} correct</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{entry.totalQuizzes}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{formatTime(entry.averageTime)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{formatDate(entry.recentActivity)}</div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quiz-Specific Leaderboards */}
      {activeTab === 'quiz-specific' && (
        <div className="space-y-6">
          {quizLeaderboards.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
              <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No quiz attempts found</p>
              <p className="text-gray-500 text-sm">Quiz-specific rankings will appear here once users start taking quizzes</p>
            </div>
          ) : (
            quizLeaderboards.map((quizBoard) => (
              <motion.div
                key={quizBoard.quiz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{quizBoard.quiz.title}</h3>
                      <p className="text-gray-400 text-sm">{quizBoard.quiz.category} • {quizBoard.topPerformers.length} participants</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      <span className="text-blue-400 text-sm">Top {Math.min(10, quizBoard.topPerformers.length)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid gap-4">
                    {quizBoard.topPerformers.map((performer) => (
                      <div
                        key={performer.user.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                          performer.rank <= 3
                            ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600'
                            : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getRankIcon(performer.rank)}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getRankBgColor(performer.rank)}`}>
                              {performer.rank}
                            </div>
                          </div>
                          
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">
                              {performer.user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium text-white">{performer.user.username}</div>
                            <div className="text-sm text-gray-400">
                              {performer.attempt.score}/{performer.attempt.total_questions} correct • {formatTime(performer.attempt.time_taken)}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            performer.percentage >= 90 ? 'text-green-400' :
                            performer.percentage >= 80 ? 'text-blue-400' :
                            performer.percentage >= 70 ? 'text-yellow-400' :
                            'text-gray-400'
                          }`}>
                            {performer.percentage}%
                          </div>
                          <div className="text-sm text-gray-400">
                            {formatDate(performer.attempt.completed_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
