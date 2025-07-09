import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Play, Trophy, Upload, Users, Clock } from 'lucide-react';
import { Quiz, QuizAttempt } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  onCreateQuiz: () => void;
  onTakeQuiz: (quiz: Quiz) => void;
  onUploadPDF: () => void;
  onViewResults: (attempt: QuizAttempt) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onCreateQuiz,
  onTakeQuiz,
  onUploadPDF,
  onViewResults,
}) => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load quizzes
      const { data: quizzesData } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      // Load recent attempts
      const { data: attemptsData } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user?.id)
        .order('completed_at', { ascending: false })
        .limit(5);

      setQuizzes(quizzesData || []);
      setRecentAttempts(attemptsData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.button
          onClick={onCreateQuiz}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-xl text-white hover:from-green-600 hover:to-emerald-700 transition-all"
        >
          <Plus className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Create Quiz</h3>
          <p className="text-green-100 text-sm">Build a new quiz for your friends</p>
        </motion.button>

        <motion.button
          onClick={onUploadPDF}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 rounded-xl text-white hover:from-purple-600 hover:to-indigo-700 transition-all"
        >
          <Upload className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Upload PDF</h3>
          <p className="text-purple-100 text-sm">Extract questions from documents</p>
        </motion.button>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-r from-yellow-500 to-orange-600 p-6 rounded-xl text-white"
        >
          <Trophy className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Your Score</h3>
          <p className="text-yellow-100 text-sm">
            {recentAttempts.length > 0 
              ? `Last: ${Math.round((recentAttempts[0].score / recentAttempts[0].total_questions) * 100)}%`
              : 'No quizzes taken yet'
            }
          </p>
        </motion.div>
      </div>

      {/* Available Quizzes */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <Play className="w-6 h-6 mr-2 text-blue-400" />
          Available Quizzes
        </h3>
        
        {quizzes.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No quizzes available yet</p>
            <button
              onClick={onCreateQuiz}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Create the first quiz
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">{quiz.title}</h4>
                    <p className="text-gray-400 text-sm mb-3">{quiz.description}</p>
                    <div className="flex items-center text-xs text-gray-500 space-x-4">
                      <span className="bg-gray-700 px-2 py-1 rounded">{quiz.category}</span>
                      <span>{quiz.questions?.length || 0} questions</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => onTakeQuiz(quiz)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Take Quiz</span>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Results */}
      {recentAttempts.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Clock className="w-6 h-6 mr-2 text-green-400" />
            Recent Results
          </h3>
          
          <div className="space-y-3">
            {recentAttempts.map((attempt) => {
              const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
              const quiz = quizzes.find(q => q.id === attempt.quiz_id);
              
              return (
                <motion.div
                  key={attempt.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => onViewResults(attempt)}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">{quiz?.title || 'Unknown Quiz'}</h4>
                      <p className="text-gray-400 text-sm">
                        {attempt.score}/{attempt.total_questions} correct • {percentage}%
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
      )}
    </div>
  );
};