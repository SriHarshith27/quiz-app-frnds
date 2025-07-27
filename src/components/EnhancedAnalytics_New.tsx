import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Clock, Target, Award, Activity } from 'lucide-react';
import { useAnalytics } from '../hooks/useQueries';
import { useAuth } from '../contexts/AuthContext';

interface AnalyticsData {
  totalQuizzes: number;
  totalUsers: number;
  totalAttempts: number;
  averageScore: number;
  popularQuizzes: Array<{
    id: string;
    title: string;
    attempts: number;
    averageScore: number;
  }>;
  userEngagement: Array<{
    date: string;
    attempts: number;
    users: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    attempts: number;
    averageScore: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'quiz_created' | 'quiz_attempted' | 'user_registered';
    description: string;
    timestamp: string;
  }>;
}

export const EnhancedAnalytics: React.FC = () => {
  const { isAdmin } = useAuth();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Use React Query hook for analytics data
  const { data: rawAnalytics, isLoading: loading, error } = useAnalytics();

  // Process the analytics data based on time range
  const analytics = useMemo(() => {
    if (!rawAnalytics) return null;

    const { quizzes, users, attempts } = rawAnalytics;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeRange));

    // Filter attempts by time range
    const filteredAttempts = attempts.filter((attempt: any) => 
      new Date(attempt.completed_at) >= startDate
    );

    // Calculate popular quizzes
    const quizAttempts = filteredAttempts.reduce((acc: any, attempt: any) => {
      const quizId = attempt.quiz_id;
      if (!acc[quizId]) {
        acc[quizId] = {
          id: quizId,
          title: attempt.quizzes?.title || 'Unknown Quiz',
          attempts: 0,
          totalScore: 0,
          totalQuestions: 0
        };
      }
      acc[quizId].attempts++;
      acc[quizId].totalScore += attempt.score;
      acc[quizId].totalQuestions += attempt.total_questions;
      return acc;
    }, {});

    const popularQuizzes = Object.values(quizAttempts)
      .map((quiz: any) => ({
        ...quiz,
        averageScore: quiz.totalQuestions > 0 ? (quiz.totalScore / quiz.totalQuestions) * 100 : 0
      }))
      .sort((a: any, b: any) => b.attempts - a.attempts)
      .slice(0, 10);

    // Calculate user engagement
    const engagementMap: { [key: string]: { attempts: number; users: Set<string> } } = {};
    
    filteredAttempts.forEach((attempt: any) => {
      const date = new Date(attempt.completed_at).toISOString().split('T')[0];
      if (!engagementMap[date]) {
        engagementMap[date] = { attempts: 0, users: new Set() };
      }
      engagementMap[date].attempts++;
      engagementMap[date].users.add(attempt.user_id);
    });

    const userEngagement = Object.entries(engagementMap)
      .map(([date, data]) => ({
        date,
        attempts: data.attempts,
        users: data.users.size
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate category performance
    const categoryMap: { [key: string]: { attempts: number; totalScore: number; totalQuestions: number } } = {};
    
    filteredAttempts.forEach((attempt: any) => {
      const category = attempt.quizzes?.category || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = { attempts: 0, totalScore: 0, totalQuestions: 0 };
      }
      categoryMap[category].attempts++;
      categoryMap[category].totalScore += attempt.score;
      categoryMap[category].totalQuestions += attempt.total_questions;
    });

    const categoryPerformance = Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        attempts: data.attempts,
        averageScore: data.totalQuestions > 0 ? (data.totalScore / data.totalQuestions) * 100 : 0
      }))
      .sort((a, b) => b.attempts - a.attempts);

    // Recent activity
    const recentActivity = [
      ...quizzes.slice(-5).map((quiz: any) => ({
        id: quiz.id,
        type: 'quiz_created' as const,
        description: `New quiz created: ${quiz.title}`,
        timestamp: quiz.created_at
      })),
      ...filteredAttempts.slice(-5).map((attempt: any) => ({
        id: attempt.id,
        type: 'quiz_attempted' as const,
        description: `Quiz attempted: ${attempt.quizzes?.title || 'Unknown'}`,
        timestamp: attempt.completed_at
      })),
      ...users.slice(-3).map((user: any) => ({
        id: user.id,
        type: 'user_registered' as const,
        description: `New user registered`,
        timestamp: user.created_at
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate totals
    const totalScore = filteredAttempts.reduce((sum: number, attempt: any) => sum + attempt.score, 0);
    const totalQuestions = filteredAttempts.reduce((sum: number, attempt: any) => sum + attempt.total_questions, 0);

    return {
      totalQuizzes: quizzes.length,
      totalUsers: users.length,
      totalAttempts: filteredAttempts.length,
      averageScore: totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0,
      popularQuizzes,
      userEngagement,
      categoryPerformance,
      recentActivity
    };
  }, [rawAnalytics, timeRange]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You need admin privileges to view analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Analytics</h2>
          <p className="text-gray-400">Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400">No analytics data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-gray-400">Comprehensive insights into quiz performance and user engagement</p>
          
          {/* Time Range Filter */}
          <div className="mt-4 flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Quizzes</p>
                <p className="text-2xl font-bold text-white">{analytics.totalQuizzes}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-white">{analytics.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Attempts</p>
                <p className="text-2xl font-bold text-white">{analytics.totalAttempts}</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Average Score</p>
                <p className="text-2xl font-bold text-white">{analytics.averageScore.toFixed(1)}%</p>
              </div>
              <Award className="w-8 h-8 text-yellow-500" />
            </div>
          </motion.div>
        </div>

        {/* Popular Quizzes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Popular Quizzes
          </h2>
          <div className="space-y-3">
            {analytics.popularQuizzes.slice(0, 5).map((quiz, index) => (
              <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">{quiz.title}</p>
                    <p className="text-gray-400 text-sm">{quiz.attempts} attempts</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{quiz.averageScore.toFixed(1)}%</p>
                  <p className="text-gray-400 text-sm">avg score</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Category Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            Category Performance
          </h2>
          <div className="space-y-3">
            {analytics.categoryPerformance.map((category) => (
              <div key={category.category} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">{category.category}</p>
                  <p className="text-gray-400 text-sm">{category.attempts} attempts</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{category.averageScore.toFixed(1)}%</p>
                  <p className="text-gray-400 text-sm">avg score</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {analytics.recentActivity.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  activity.type === 'quiz_created' ? 'bg-blue-500' :
                  activity.type === 'quiz_attempted' ? 'bg-green-500' :
                  'bg-purple-500'
                }`} />
                <div className="flex-1">
                  <p className="text-white text-sm">{activity.description}</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(activity.timestamp).toLocaleDateString()} at{' '}
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
