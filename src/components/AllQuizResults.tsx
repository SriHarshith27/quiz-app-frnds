import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Clock, Target, ChevronDown, ChevronRight, Calendar, BookOpen, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { QuizAttempt, Quiz, User } from '../types';

interface UserWithAttempts extends User {
  attempts: (QuizAttempt & { quiz?: Quiz })[];
  totalAttempts: number;
  averageScore: number;
}

interface AllQuizResultsProps {
  onViewAttempt?: (attemptId: string) => void;
}

export const AllQuizResults: React.FC<AllQuizResultsProps> = ({ onViewAttempt }) => {
  const [users, setUsers] = useState<UserWithAttempts[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'attempts' | 'average'>('name');

  useEffect(() => {
    loadAllResults();
  }, []);

  const loadAllResults = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all users with their quiz attempts
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'user')
        .order('username');

      if (usersError) throw usersError;

      // Load all quiz attempts with quiz details
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes (
            id,
            title,
            category,
            description
          )
        `)
        .order('completed_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Load all quizzes for reference
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*');

      if (quizzesError) throw quizzesError;

      // Combine users with their attempts
      const usersWithAttempts: UserWithAttempts[] = usersData?.map(user => {
        const userAttempts = attemptsData?.filter(attempt => attempt.user_id === user.id) || [];
        
        // Calculate average score
        const totalScore = userAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
        const totalQuestions = userAttempts.reduce((sum, attempt) => sum + attempt.total_questions, 0);
        const averageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

        // Add quiz details to attempts
        const attemptsWithQuiz = userAttempts.map(attempt => ({
          ...attempt,
          quiz: quizzesData?.find(quiz => quiz.id === attempt.quiz_id)
        }));

        return {
          ...user,
          attempts: attemptsWithQuiz,
          totalAttempts: userAttempts.length,
          averageScore
        };
      }) || [];

      setUsers(usersWithAttempts);
    } catch (err) {
      console.error('Error loading quiz results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz results');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-900 text-green-300';
    if (percentage >= 60) return 'bg-yellow-900 text-yellow-300';
    return 'bg-red-900 text-red-300';
  };

  // Filter and sort users
  const filteredUsers = users
    .filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.username.localeCompare(b.username);
        case 'attempts':
          return b.totalAttempts - a.totalAttempts;
        case 'average':
          return b.averageScore - a.averageScore;
        default:
          return 0;
      }
    });

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
        <p className="text-red-400 mb-4">Error loading quiz results</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button
          onClick={loadAllResults}
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
          <h2 className="text-2xl font-bold text-white mb-2">All Quiz Results</h2>
          <p className="text-gray-400">View and manage all user quiz attempts</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'attempts' | 'average')}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="attempts">Sort by Attempts</option>
            <option value="average">Sort by Average</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-white">{users.length}</p>
              <p className="text-gray-400 text-sm">Total Users</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-white">
                {users.reduce((sum, user) => sum + user.totalAttempts, 0)}
              </p>
              <p className="text-gray-400 text-sm">Total Attempts</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Target className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-white">
                {users.length > 0 ? Math.round(users.reduce((sum, user) => sum + user.averageScore, 0) / users.length) : 0}%
              </p>
              <p className="text-gray-400 text-sm">Overall Average</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No users found</p>
            <p className="text-gray-500 text-sm">Try adjusting your search criteria</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
            >
              {/* User Header */}
              <div
                onClick={() => toggleUserExpanded(user.id)}
                className="p-6 cursor-pointer hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {expandedUsers.has(user.id) ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{user.username}</h3>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <p className="text-white font-medium">{user.totalAttempts}</p>
                      <p className="text-gray-400">Attempts</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-medium ${getScoreColor(user.averageScore)}`}>
                        {user.averageScore}%
                      </p>
                      <p className="text-gray-400">Average</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Attempts */}
              <AnimatePresence>
                {expandedUsers.has(user.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="border-t border-gray-700 bg-gray-900/50">
                      {user.attempts.length === 0 ? (
                        <div className="p-6 text-center">
                          <BookOpen className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-400">No quiz attempts yet</p>
                        </div>
                      ) : (
                        <div className="p-6 space-y-3">
                          {user.attempts.map((attempt) => {
                            const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
                            return (
                              <div
                                key={attempt.id}
                                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-white font-medium">
                                      {attempt.quiz?.title || 'Unknown Quiz'}
                                    </h4>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBgColor(percentage)}`}>
                                      {percentage}%
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                                    <span className="flex items-center">
                                      <Trophy className="w-4 h-4 mr-1" />
                                      {attempt.score}/{attempt.total_questions}
                                    </span>
                                    <span className="flex items-center">
                                      <Clock className="w-4 h-4 mr-1" />
                                      {Math.floor(attempt.time_taken / 60)}:{String(attempt.time_taken % 60).padStart(2, '0')}
                                    </span>
                                    <span className="flex items-center">
                                      <Calendar className="w-4 h-4 mr-1" />
                                      {formatDate(attempt.completed_at)}
                                    </span>
                                    {attempt.quiz?.category && (
                                      <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                                        {attempt.quiz.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {onViewAttempt && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onViewAttempt(attempt.id);
                                    }}
                                    className="ml-4 p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="View detailed results"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
