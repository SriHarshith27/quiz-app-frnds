import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Clock, Target, Award, Calendar, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  const { user, isAdmin } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    }
  }, [isAdmin, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Set admin context
      if (user) {
        await supabase.rpc('set_config', {
          setting_name: 'app.current_user',
          setting_value: user.username
        });
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));

      // Load basic stats
      const [quizzesRes, usersRes, attemptsRes] = await Promise.all([
        supabase.from('quizzes').select('id, title, category, created_at'),
        supabase.from('users').select('id, created_at').neq('role', 'admin'),
        supabase.from('quiz_attempts').select(`
          id, score, total_questions, completed_at, quiz_id,
          quizzes!inner(title, category)
        `).gte('completed_at', startDate.toISOString())
      ]);

      const quizzes = quizzesRes.data || [];
      const users = usersRes.data || [];
      const attempts = attemptsRes.data || [];

      // Calculate popular quizzes
      const quizAttempts = attempts.reduce((acc, attempt) => {
        const quizId = attempt.quiz_id;
        if (!acc[quizId]) {
          acc[quizId] = {
            id: quizId,
            title: attempt.quizzes.title,
            attempts: 0,
            totalScore: 0,
            totalQuestions: 0
          };
        }
        acc[quizId].attempts++;
        acc[quizId].totalScore += attempt.score;
        acc[quizId].totalQuestions += attempt.total_questions;
        return acc;
      }, {} as any);

      const popularQuizzes = Object.values(quizAttempts)
        .map((quiz: any) => ({
          id: quiz.id,
          title: quiz.title,
          attempts: quiz.attempts,
          averageScore: Math.round((quiz.totalScore / quiz.totalQuestions) * 100)
        }))
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 5);

      // Calculate user engagement over time
      const engagementMap = new Map();
      attempts.forEach(attempt => {
        const date = new Date(attempt.completed_at).toISOString().split('T')[0];
        if (!engagementMap.has(date)) {
          engagementMap.set(date, { attempts: 0, users: new Set() });
        }
        const day = engagementMap.get(date);
        day.attempts++;
        day.users.add(attempt.user_id);
      });

      const userEngagement = Array.from(engagementMap.entries())
        .map(([date, data]) => ({
          date,
          attempts: data.attempts,
          users: data.users.size
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14); // Last 14 days

      // Calculate category performance
      const categoryMap = new Map();
      attempts.forEach(attempt => {
        const category = attempt.quizzes.category;
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { attempts: 0, totalScore: 0, totalQuestions: 0 });
        }
        const cat = categoryMap.get(category);
        cat.attempts++;
        cat.totalScore += attempt.score;
        cat.totalQuestions += attempt.total_questions;
      });

      const categoryPerformance = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          attempts: data.attempts,
          averageScore: Math.round((data.totalScore / data.totalQuestions) * 100)
        }))
        .sort((a, b) => b.attempts - a.attempts);

      // Generate recent activity
      const recentActivity = [
        ...quizzes.slice(-5).map(quiz => ({
          id: quiz.id,
          type: 'quiz_created' as const,
          description: `New quiz "${quiz.title}" created`,
          timestamp: quiz.created_at
        })),
        ...attempts.slice(-5).map(attempt => ({
          id: attempt.id,
          type: 'quiz_attempted' as const,
          description: `Quiz "${attempt.quizzes.title}" completed`,
          timestamp: attempt.completed_at
        })),
        ...users.slice(-3).map(user => ({
          id: user.id,
          type: 'user_registered' as const,
          description: 'New user registered',
          timestamp: user.created_at
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      // Calculate overall stats
      const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
      const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.total_questions, 0);
      const averageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

      setAnalytics({
        totalQuizzes: quizzes.length,
        totalUsers: users.length,
        totalAttempts: attempts.length,
        averageScore,
        popularQuizzes,
        userEngagement,
        categoryPerformance,
        recentActivity
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <BarChart3 className="w-7 h-7 mr-3 text-blue-400" />
          Analytics Dashboard
        </h2>
        <div className="flex items-center space-x-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white">{analytics.totalQuizzes}</p>
              <p className="text-gray-400 text-xs sm:text-sm">Total Quizzes</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white">{analytics.totalUsers}</p>
              <p className="text-gray-400 text-xs sm:text-sm">Active Users</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white">{analytics.totalAttempts}</p>
              <p className="text-gray-400 text-xs sm:text-sm">Quiz Attempts</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white">{analytics.averageScore}%</p>
              <p className="text-gray-400 text-xs sm:text-sm">Avg Score</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts and Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Quizzes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-yellow-400" />
            Popular Quizzes
          </h3>
          <div className="space-y-3">
            {analytics.popularQuizzes.map((quiz, index) => (
              <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-orange-500 text-black' :
                    'bg-gray-600 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{quiz.title}</p>
                    <p className="text-gray-400 text-xs">{quiz.attempts} attempts</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium text-sm">{quiz.averageScore}%</p>
                  <p className="text-gray-400 text-xs">avg score</p>
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
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
            Category Performance
          </h3>
          <div className="space-y-4">
            {analytics.categoryPerformance.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{category.category}</span>
                  <div className="text-right">
                    <span className="text-white font-medium text-sm">{category.averageScore}%</span>
                    <span className="text-gray-400 text-xs ml-2">({category.attempts})</span>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    className={`h-2 rounded-full ${
                      category.averageScore >= 80 ? 'bg-green-500' :
                      category.averageScore >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${category.averageScore}%` }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* User Engagement Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-400" />
          User Engagement (Last 14 Days)
        </h3>
        <div className="h-64 flex items-end justify-between space-x-1">
          {analytics.userEngagement.map((day, index) => {
            const maxAttempts = Math.max(...analytics.userEngagement.map(d => d.attempts));
            const height = maxAttempts > 0 ? (day.attempts / maxAttempts) * 100 : 0;
            
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <motion.div
                  className="w-full bg-blue-500 rounded-t-sm min-h-[4px] relative group cursor-pointer"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 4)}%` }}
                  transition={{ delay: 0.7 + index * 0.05 }}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {day.attempts} attempts<br />
                    {day.users} users
                  </div>
                </motion.div>
                <span className="text-gray-400 text-xs mt-2 transform -rotate-45 origin-left">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-purple-400" />
          Recent Activity
        </h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {analytics.recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activity.type === 'quiz_created' ? 'bg-green-500/20 text-green-400' :
                activity.type === 'quiz_attempted' ? 'bg-blue-500/20 text-blue-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                {activity.type === 'quiz_created' ? <BarChart3 className="w-4 h-4" /> :
                 activity.type === 'quiz_attempted' ? <Activity className="w-4 h-4" /> :
                 <Users className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">{activity.description}</p>
                <p className="text-gray-400 text-xs">
                  {new Date(activity.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};