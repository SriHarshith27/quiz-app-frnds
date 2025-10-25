import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye, Clock, Play, ArrowLeft, BookOpen, Star, Heart, Share2, AlertCircle } from 'lucide-react';
import { Quiz } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useUserQuizAttempts } from '../hooks/useQueries';

// Interface for preview questions (only fields needed for display)
interface PreviewQuestion {
  id: string;
  question: string;
  options: string[];
  category: string;
}

interface QuizPreviewProps {
  quiz: Quiz;
  onBack: () => void;
  onStartQuiz: () => void;
}

export const QuizPreview: React.FC<QuizPreviewProps> = ({ quiz, onBack, onStartQuiz }) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<PreviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  // Use React Query to fetch user attempts for this specific quiz
  const { data: userAttempts = [], isLoading: attemptsLoading } = useUserQuizAttempts(
    user?.id || '', 
    quiz.id
  );

  // Calculate if user has reached the attempt limit
  const hasReachedAttemptLimit = useMemo(() => {
    if (!quiz.max_attempts || quiz.max_attempts === 0) return false;
    return userAttempts.length >= quiz.max_attempts;
  }, [userAttempts.length, quiz.max_attempts]);

  const attemptCount = userAttempts.length;

  useEffect(() => {
    loadQuizDetails();
  }, [quiz.id, user?.id]);

  const loadQuizDetails = async () => {
    try {
      setLoading(true);
      
      // Load sample questions for preview
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question, options, category')
        .eq('quiz_id', quiz.id)
        .limit(3);

      if (questionsError) {
        console.error('Error loading questions:', questionsError);
        // Don't fail completely, just log the error
      }

      if (questionsData && questionsData.length > 0) {
        setQuestions(questionsData);
        
        // Calculate difficulty based on question complexity
        const avgLength = questionsData.reduce((sum, q) => sum + (q.question?.length || 0), 0) / questionsData.length;
        if (avgLength > 100) setDifficulty('Hard');
        else if (avgLength > 50) setDifficulty('Medium');
        else setDifficulty('Easy');
      }

      // Check if the quiz is favorited by the current user
      if (user) {
        const { data: favorite, error: favoriteError } = await supabase
          .from('user_favorites')
          .select('user_id')
          .eq('user_id', user.id)
          .eq('quiz_id', quiz.id)
          .single();
        
        if (!favoriteError && favorite) {
          setIsFavorited(true);
        }
      }
    } catch (error) {
      console.error('Error loading quiz details:', error);
      // Don't throw error, allow component to render with available data
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      alert('Please log in to favorite quizzes');
      return;
    }

    try {
      if (isFavorited) {
        // If already favorited, remove from favorites
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('quiz_id', quiz.id);

        if (error) throw error;
        setIsFavorited(false);
      } else {
        // If not favorited, add to favorites
        const { error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            quiz_id: quiz.id
          });

        if (error) throw error;
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
      alert('Failed to update favorite status. Please try again.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: quiz.title,
          text: quiz.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Quiz link copied to clipboard!');
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy': return 'text-green-400 bg-green-900/30';
      case 'Medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'Hard': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Mobile-optimized Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors touch-target"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Quizzes</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFavorite}
              className={`p-2 rounded-lg transition-colors touch-target ${
                isFavorited ? 'text-red-400 bg-red-900/30' : 'text-gray-400 hover:text-red-400'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg text-gray-400 hover:text-blue-400 transition-colors touch-target"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quiz Info Card - Mobile Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-2xl p-4 sm:p-8 border border-gray-700 mb-6 sm:mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
            <div className="flex-1 mb-6 lg:mb-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">{quiz.title}</h1>
              <p className="text-gray-300 text-base sm:text-lg mb-4 leading-relaxed">{quiz.description}</p>
              
              {/* Mobile-friendly tags */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-1 rounded-full">
                  <BookOpen className="w-4 h-4" />
                  <span>{quiz.category}</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-1 rounded-full">
                  <Eye className="w-4 h-4" />
                  <span>{questions.length} questions</span>
                </div>
                {quiz.time_limit && (
                  <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-1 rounded-full">
                    <Clock className="w-4 h-4" />
                    <span>{quiz.time_limit} min</span>
                  </div>
                )}
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
                  <Star className="w-3 h-3 inline mr-1" />
                  {difficulty}
                </div>
              </div>
            </div>
            
            {/* Mobile-optimized Start Button with Attempt Limit Validation */}
            {hasReachedAttemptLimit ? (
              <div className="w-full lg:w-auto">
                <button
                  disabled
                  className="w-full bg-gray-600 text-gray-400 px-6 sm:px-8 py-3 sm:py-4 rounded-xl flex items-center justify-center space-x-3 cursor-not-allowed opacity-75"
                >
                  <AlertCircle className="w-5 sm:w-6 h-5 sm:h-6" />
                  <span className="text-base sm:text-lg font-semibold">Attempt Limit Reached</span>
                </button>
                <p className="text-red-400 text-sm mt-2 text-center">
                  You have reached the maximum number of attempts ({quiz.max_attempts}) for this quiz.
                </p>
              </div>
            ) : (
              <button
                onClick={onStartQuiz}
                disabled={attemptsLoading}
                className="w-full lg:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl flex items-center justify-center space-x-3 transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg touch-target"
              >
                <Play className="w-5 sm:w-6 h-5 sm:h-6" />
                <span className="text-base sm:text-lg font-semibold">
                  {attemptsLoading ? 'Loading...' : 'Start Quiz'}
                </span>
              </button>
            )}
          </div>

          {/* Quiz Stats - Mobile Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gray-700/50 rounded-xl">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-blue-400">{questions.length}</p>
              <p className="text-gray-400 text-xs sm:text-sm">Questions</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-green-400">
                {quiz.time_limit ? `${quiz.time_limit}min` : '∞'}
              </p>
              <p className="text-gray-400 text-xs sm:text-sm">Time Limit</p>
            </div>
            <div className="text-center col-span-2 sm:col-span-1">
              <p className={`text-xl sm:text-2xl font-bold ${
                hasReachedAttemptLimit ? 'text-red-400' : 'text-purple-400'
              }`}>
                {attemptCount}/{quiz.max_attempts || '∞'}
              </p>
              <p className="text-gray-400 text-xs sm:text-sm">Attempts</p>
            </div>
          </div>
        </motion.div>

        {/* Sample Questions - Mobile Optimized */}
        {questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-2xl p-4 sm:p-8 border border-gray-700"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
              <Eye className="w-5 sm:w-6 h-5 sm:h-6 mr-3 text-blue-400" />
              Sample Questions
            </h2>
            
            <div className="space-y-4 sm:space-y-6">
              {questions.slice(0, 3).map((question, index) => (
                <div key={question.id} className="border border-gray-700 rounded-xl p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-0">
                      Question {index + 1}
                    </h3>
                    <span className="bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-300 self-start">
                      {question.category}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 mb-4 leading-relaxed text-sm sm:text-base">
                    {question.question}
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2 sm:gap-3">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="p-3 bg-gray-700/50 rounded-lg border border-gray-600"
                      >
                        <span className="text-gray-300 text-sm sm:text-base">{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {questions.length > 3 && (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm sm:text-base">
                    And {questions.length - 3} more questions...
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Instructions - Mobile Friendly */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 sm:mt-8 bg-blue-900/20 rounded-xl p-4 sm:p-6 border border-blue-700"
        >
          <h3 className="text-base sm:text-lg font-semibold text-blue-300 mb-4">Quiz Instructions</h3>
          <ul className="space-y-2 text-blue-200 text-sm sm:text-base">
            <li>• Read each question carefully before selecting your answer</li>
            <li>• Navigate between questions using Previous/Next buttons</li>
            <li>• Review your answers before submitting the quiz</li>
            {quiz.time_limit && (
              <li>• You have {quiz.time_limit} minutes to complete this quiz</li>
            )}
            {quiz.max_attempts && (
              <li>• You can attempt this quiz up to {quiz.max_attempts} times</li>
            )}
            <li>• Results will be available immediately after submission</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
};