import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Trophy, Clock, Target, TrendingUp, CheckCircle, XCircle, Users, Search, Heart } from 'lucide-react';
import { Quiz, QuizAttempt, UserProgress, UserAnswer } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useQuizzes, useUserAttempts } from '../hooks/useQueries';
import { QuizSearch } from './QuizSearch';
import { QuizPreview } from './QuizPreview';

interface QuizWithCount extends Quiz {
  questionCount: number;
}

interface UserDashboardProps {
  onTakeQuiz: (quiz: Quiz) => void;
  onViewResults: (attempt: QuizAttempt) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onTakeQuiz,
  onViewResults,
}) => {
  const { user } = useAuth();
  const [filteredQuizzes, setFilteredQuizzes] = useState<QuizWithCount[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);

  // Use React Query hooks for data fetching
  const { data: quizzes, isLoading: quizzesLoading } = useQuizzes();
  const { data: userAttempts, isLoading: attemptsLoading } = useUserAttempts(user?.id || '');

  // Combine loading states
  const loading = quizzesLoading || attemptsLoading;

  // Process data when it's loaded
  useEffect(() => {
    if (quizzes && user) {
      const now = new Date();
      const processedQuizzes = quizzes
        .filter((quiz: any) => {
          const quizStartTime = quiz.start_time ? new Date(quiz.start_time) : null;
          const isAvailableByStartTime = !quizStartTime || now >= quizStartTime;
          return isAvailableByStartTime;
        })
        .map((quiz: any) => ({
          ...quiz,
          questionCount: quiz.questions?.[0]?.count || 0
        }));
      
      setFilteredQuizzes(processedQuizzes);
    }
  }, [quizzes, user]);

  // Calculate user progress when attempts data changes
  useEffect(() => {
    if (userAttempts) {
      calculateUserProgress(userAttempts);
    }
  }, [userAttempts]);

  const handleQuizClick = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setShowPreview(true);
  };

  const handleStartQuiz = () => {
    if (selectedQuiz) {
      setShowPreview(false);
      onTakeQuiz(selectedQuiz);
    }
  };

  const handleBackFromPreview = () => {
    setShowPreview(false);
    setSelectedQuiz(null);
  };

  const handleSearch = (searchTerm: string, selectedCategory: string, _selectedDifficulty: string, sortBy: string) => {
    if (!quizzes) return;
    
    let filtered = [...quizzes];

    // Apply search term filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(quiz => 
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(quiz => quiz.category === selectedCategory);
    }

    // Note: difficulty filter is not applied since Quiz interface doesn't have difficulty property

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'Newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'Oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'A-Z':
          return a.title.localeCompare(b.title);
        case 'Z-A':
          return b.title.localeCompare(a.title);
        case 'Most Questions':
          return b.questionCount - a.questionCount;
        case 'Least Questions':
          return a.questionCount - b.questionCount;
        default:
          return 0;
      }
    });

    setFilteredQuizzes(filtered);
  };

  useEffect(() => {
    // Initialize filtered quizzes when quizzes change
    if (quizzes) {
      setFilteredQuizzes(quizzes);
    }
  }, [quizzes]);

  const calculateUserProgress = (attempts: QuizAttempt[]) => {
    if (attempts.length === 0) {
      setUserProgress({
        totalQuizzes: 0,
        averageScore: 0,
        strongCategories: [],
        weakCategories: [],
        recentAttempts: []
      });
      return;
    }

    const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
    const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.total_questions, 0);
    const averageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    // Analyze category performance
    const categoryStats: { [key: string]: { correct: number; total: number } } = {};
    
    attempts.forEach(attempt => {
      const answers = typeof attempt.answers === 'string' 
        ? JSON.parse(attempt.answers) 
        : attempt.answers;
      
      if (Array.isArray(answers)) {
        answers.forEach((answer: UserAnswer) => {
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

    const categoryPerformances = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      percentage: Math.round((stats.correct / stats.total) * 100)
    }));

    const strongCategories = categoryPerformances
      .filter(c => c.percentage >= 80)
      .map(c => c.category);
    
    const weakCategories = categoryPerformances
      .filter(c => c.percentage < 60)
      .map(c => c.category);

    setUserProgress({
      totalQuizzes: attempts.length,
      averageScore,
      strongCategories,
      weakCategories,
      recentAttempts: attempts.slice(0, 5)
    });
  };

  if (showPreview && selectedQuiz) {
    return (
      <QuizPreview
        quiz={selectedQuiz}
        onBack={handleBackFromPreview}
        onStartQuiz={handleStartQuiz}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* User Stats */}
      {userProgress && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center space-x-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-white">{userProgress.totalQuizzes}</p>
                <p className="text-gray-400 text-sm">Quizzes Taken</p>
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
              <Target className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-white">{userProgress.averageScore}%</p>
                <p className="text-gray-400 text-sm">Average Score</p>
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
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-white">{userProgress.strongCategories.length}</p>
                <p className="text-gray-400 text-sm">Strong Areas</p>
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
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-white">{userProgress.weakCategories.length}</p>
                <p className="text-gray-400 text-sm">Areas to Improve</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Available Quizzes */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <Play className="w-6 h-6 mr-2 text-blue-400" />
          Available Quizzes
        </h3>
        
        {/* Search and Filter */}
        <div className="mb-6">
          <QuizSearch 
            onSearch={handleSearch}
          />
        </div>
        
        {filteredQuizzes.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
            {(quizzes?.length || 0) === 0 ? (
              <>
                <Trophy className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No quizzes available yet</p>
                <p className="text-gray-500 text-sm">Check back later for new quizzes!</p>
              </>
            ) : (
              <>
                <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No quizzes match your search</p>
                <p className="text-gray-500 text-sm">Try adjusting your filters or search terms</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredQuizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleQuizClick(quiz)}
                className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer"
              >
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                  <h4 className="text-lg sm:text-xl font-semibold text-white mb-2">{quiz.title}</h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle favorite functionality
                      }}
                      className="text-gray-400 hover:text-red-400 transition-colors p-2 touch-target"
                    >
                      <Heart className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm sm:text-base mb-3 line-clamp-2">{quiz.description}</p>
                  <div className="flex flex-wrap items-center text-xs sm:text-sm text-gray-500 gap-2">
                    <span className="bg-gray-700 px-3 py-1.5 rounded-full">{quiz.category}</span>
                    <span>{quiz.questionCount} questions</span>
                    {quiz.time_limit && (
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {quiz.time_limit}min
                      </span>
                    )}
                    {quiz.max_attempts && (
                      <span className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {quiz.max_attempts} attempts
                      </span>
                    )}
                  </div>
                </div>
                
                {(() => {
                  const userAttempts = userProgress?.recentAttempts.filter(attempt => attempt.quiz_id === quiz.id) || [];
                  const hasAttempted = userAttempts.length > 0;
                  const canAttempt = !quiz.max_attempts || userAttempts.length < quiz.max_attempts;
                  
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTakeQuiz(quiz);
                      }}
                      disabled={!canAttempt}
                      className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 min-h-[44px] touch-target ${
                        !canAttempt
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : hasAttempted 
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <Play className="w-4 h-4" />
                      <span>
                        {!canAttempt 
                          ? `Max attempts reached (${userAttempts.length}/${quiz.max_attempts})`
                          : hasAttempted 
                            ? `Re-attempt Quiz (${userAttempts.length}/${quiz.max_attempts || '∞'})`
                            : 'Take Quiz'
                        }
                      </span>
                    </button>
                  );
                })()}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Results */}
      {userProgress && userProgress.recentAttempts.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Clock className="w-6 h-6 mr-2 text-green-400" />
            Recent Results
          </h3>
          
          <div className="space-y-3">
            {userProgress.recentAttempts.map((attempt) => {
              const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
              const quiz = quizzes?.find(q => q.id === attempt.quiz_id);
              
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
      )}

      {/* Performance Insights */}
      {userProgress && (userProgress.strongCategories.length > 0 || userProgress.weakCategories.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userProgress.strongCategories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Your Strong Areas
              </h3>
              <div className="space-y-2">
                {userProgress.strongCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-green-300">{category}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {userProgress.weakCategories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                Areas to Improve
              </h3>
              <div className="space-y-2">
                {userProgress.weakCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-red-300">{category}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};