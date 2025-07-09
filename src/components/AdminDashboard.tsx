import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Trophy, Download, BarChart3, FileText, Eye, EyeOff, Key } from 'lucide-react';
import { Quiz, QuizAttempt, User } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AdminDashboardProps {
  onCreateQuiz: () => void;
  onUploadCSV: () => void;
  onViewResults: (attempt: QuizAttempt) => void;
}

interface AdminStats {
  totalQuizzes: number;
  totalUsers: number;
  totalAttempts: number;
  averageScore: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onCreateQuiz,
  onUploadCSV,
  onViewResults,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalQuizzes: 0,
    totalUsers: 0,
    totalAttempts: 0,
    averageScore: 0
  });
  const [recentAttempts, setRecentAttempts] = useState<(QuizAttempt & { user: User; quiz: Quiz })[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCredentials, setShowCredentials] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      // Set admin context for RLS
      if (user) {
        await supabase.rpc('set_config', {
          setting_name: 'app.current_user',
          setting_value: user.username
        });
      }

      // Load stats
      const [quizzesRes, usersRes, attemptsRes] = await Promise.all([
        supabase.from('quizzes').select('id'),
        supabase.from('users').select('*').neq('role', 'admin'),
        supabase.from('quiz_attempts').select(`
          *,
          users!inner(username, email),
          quizzes!inner(title)
        `).order('completed_at', { ascending: false }).limit(10)
      ]);

      const totalQuizzes = quizzesRes.data?.length || 0;
      const totalUsers = usersRes.data?.length || 0;
      
      // Calculate average score from all attempts
      const { data: allAttempts } = await supabase
        .from('quiz_attempts')
        .select('score, total_questions');
      
      let averageScore = 0;
      if (allAttempts && allAttempts.length > 0) {
        const totalScore = allAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
        const totalQuestions = allAttempts.reduce((sum, attempt) => sum + attempt.total_questions, 0);
        averageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
      }

      setStats({
        totalQuizzes,
        totalUsers,
        totalAttempts: allAttempts?.length || 0,
        averageScore
      });

      if (usersRes.data) {
        setUsers(usersRes.data);
      }

      if (attemptsRes.data) {
        const formattedAttempts = attemptsRes.data.map(attempt => ({
          ...attempt,
          user: attempt.users,
          quiz: attempt.quizzes
        }));
        setRecentAttempts(formattedAttempts);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadUserReport = async (userId: string, username: string) => {
    try {
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes(title, category)
        `)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (!attempts || attempts.length === 0) {
        alert('No quiz attempts found for this user');
        return;
      }

      let reportContent = `Quiz Performance Report for ${username}\n`;
      reportContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
      reportContent += `${'='.repeat(50)}\n\n`;

      reportContent += `SUMMARY\n`;
      reportContent += `${'='.repeat(20)}\n`;
      reportContent += `Total Quizzes Taken: ${attempts.length}\n`;
      
      const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
      const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.total_questions, 0);
      const averageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
      
      reportContent += `Overall Average Score: ${averageScore}%\n`;
      reportContent += `Total Questions Answered: ${totalQuestions}\n`;
      reportContent += `Total Correct Answers: ${totalScore}\n\n`;

      reportContent += `DETAILED RESULTS\n`;
      reportContent += `${'='.repeat(20)}\n`;

      for (const attempt of attempts) {
        const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
        reportContent += `\nQuiz: ${attempt.quizzes?.title || 'Unknown'}\n`;
        reportContent += `Category: ${attempt.quizzes?.category || 'General'}\n`;
        reportContent += `Date: ${new Date(attempt.completed_at).toLocaleDateString()}\n`;
        reportContent += `Score: ${attempt.score}/${attempt.total_questions} (${percentage}%)\n`;
        reportContent += `Time Taken: ${Math.floor(attempt.time_taken / 60)}:${String(attempt.time_taken % 60).padStart(2, '0')}\n`;

        // Parse answers for detailed breakdown
        const answers = typeof attempt.answers === 'string' 
          ? JSON.parse(attempt.answers) 
          : attempt.answers;

        if (Array.isArray(answers)) {
          reportContent += `\nQuestion Breakdown:\n`;
          answers.forEach((answer, index) => {
            const status = answer.is_correct ? '✓ CORRECT' : '✗ INCORRECT';
            reportContent += `  ${index + 1}. ${status}\n`;
            if (answer.question) {
              reportContent += `     Q: ${answer.question}\n`;
              if (answer.options && answer.options[answer.selected_answer]) {
                reportContent += `     Your Answer: ${answer.options[answer.selected_answer]}\n`;
              }
              if (answer.options && answer.correct_answer !== undefined) {
                reportContent += `     Correct Answer: ${answer.options[answer.correct_answer]}\n`;
              }
            }
          });
        }
        reportContent += `${'-'.repeat(30)}\n`;
      }

      // Category analysis
      const categoryStats: { [key: string]: { correct: number; total: number } } = {};
      attempts.forEach(attempt => {
        const answers = typeof attempt.answers === 'string' 
          ? JSON.parse(attempt.answers) 
          : attempt.answers;
        
        if (Array.isArray(answers)) {
          answers.forEach(answer => {
            const category = answer.category || 'General';
            if (!categoryStats[category]) {
              categoryStats[category] = { correct: 0, total: 0 };
            }
            categoryStats[category].total++;
            if (answer.is_correct) {
              categoryStats[category].correct++;
            }
          });
        }
      });

      if (Object.keys(categoryStats).length > 0) {
        reportContent += `\nCATEGORY PERFORMANCE\n`;
        reportContent += `${'='.repeat(20)}\n`;
        Object.entries(categoryStats).forEach(([category, stats]) => {
          const percentage = Math.round((stats.correct / stats.total) * 100);
          reportContent += `${category}: ${stats.correct}/${stats.total} (${percentage}%)\n`;
        });
      }

      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${username}-quiz-report-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(userId)) {
      newVisible.delete(userId);
    } else {
      newVisible.add(userId);
    }
    setVisiblePasswords(newVisible);
  };

  const decodePassword = (passwordHash: string): string => {
    try {
      // Since we're using base64 encoding (replace with proper decryption in production)
      return atob(passwordHash);
    } catch {
      return 'Unable to decode';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalQuizzes}</p>
              <p className="text-gray-400 text-sm">Total Quizzes</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
              <p className="text-gray-400 text-sm">Active Users</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalAttempts}</p>
              <p className="text-gray-400 text-sm">Quiz Attempts</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.averageScore}%</p>
              <p className="text-gray-400 text-sm">Average Score</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.button
          onClick={onCreateQuiz}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-xl text-white hover:from-green-600 hover:to-emerald-700 transition-all"
        >
          <Plus className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Create New Quiz</h3>
          <p className="text-green-100 text-sm">Build a new quiz for users</p>
        </motion.button>

        <motion.button
          onClick={onUploadCSV}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 rounded-xl text-white hover:from-purple-600 hover:to-indigo-700 transition-all"
        >
          <FileText className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Upload CSV Questions</h3>
          <p className="text-purple-100 text-sm">Import questions from CSV file</p>
        </motion.button>
      </div>

      {/* User Management */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <Users className="w-6 h-6 mr-2 text-green-400" />
            User Management
          </h3>
          <button
            onClick={() => setShowCredentials(!showCredentials)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              showCredentials 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{showCredentials ? 'Hide Credentials' : 'Show Credentials'}</span>
          </button>
        </div>
        
        {showCredentials && (
          <div className="mb-4 p-4 bg-yellow-900/20 rounded-lg border border-yellow-700">
            <div className="flex items-center space-x-2 mb-2">
              <Key className="w-5 h-5 text-yellow-400" />
              <h4 className="text-yellow-300 font-medium">Security Notice</h4>
            </div>
            <p className="text-yellow-200 text-sm">
              User credentials are now visible. Use this information responsibly to help users who have forgotten their login details.
            </p>
          </div>
        )}
        
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  {showCredentials && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Password
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-white">{user.username}</div>
                        {user.role === 'admin' && (
                          <span className="ml-2 px-2 py-1 text-xs bg-purple-600 text-white rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{user.email}</div>
                    </td>
                    {showCredentials && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm text-gray-300 font-mono">
                            {visiblePasswords.has(user.id) 
                              ? decodePassword(user.password_hash || '') 
                              : '••••••••'
                            }
                          </div>
                          <button
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            {visiblePasswords.has(user.id) ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => downloadUserReport(user.id, user.username)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Report</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Credentials Helper Section */}
      {showCredentials && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Key className="w-5 h-5 mr-2 text-blue-400" />
            How to Help Users with Forgotten Credentials
          </h3>
          
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium">Find the user in the table above</p>
                <p className="text-sm text-gray-400">Look for their username or email address</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium">Click the eye icon to reveal their password</p>
                <p className="text-sm text-gray-400">The password will be shown in plain text</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                3
              </div>
              <div>
                <p className="font-medium">Share the credentials securely</p>
                <p className="text-sm text-gray-400">Send them their username and password through a secure channel</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-red-900/20 rounded-lg border border-red-700">
            <p className="text-red-300 text-sm">
              <strong>Security Reminder:</strong> Only share credentials through secure, private channels. 
              Consider asking users to change their password after recovery.
            </p>
          </div>
        </motion.div>
      )}

      {/* User Management */}
      <div>
          <BarChart3 className="w-6 h-6 mr-2 text-purple-400" />
          Recent Quiz Attempts
        </h3>
        
        <div className="space-y-3">
          {recentAttempts.map((attempt) => {
            const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
            
            return (
              <motion.div
                key={attempt.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => onViewResults(attempt)}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">{attempt.quiz.title}</h4>
                    <p className="text-gray-400 text-sm">
                      {attempt.user.username} • {attempt.score}/{attempt.total_questions} correct
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(attempt.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    percentage >= 80 ? 'bg-green-900 text-green-300' :
                    percentage >= 60 ? 'bg-yellow-900 text-yellow-300' :
                    'bg-red-900 text-red-300'
                  }`}>
                    {percentage}%
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};