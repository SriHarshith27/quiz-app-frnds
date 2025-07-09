import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Trophy, Download, BarChart3, FileText } from 'lucide-react';
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
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <Users className="w-6 h-6 mr-2 text-green-400" />
          User Management
        </h3>
        
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
                      <div className="text-sm font-medium text-white">{user.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{user.email}</div>
                    </td>
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

      {/* Recent Activity */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
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