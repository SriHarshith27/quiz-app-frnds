import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Clock, Users, Play, ArrowLeft, BookOpen } from 'lucide-react';
import { Quiz, Question } from '../types';
import { supabase } from '../lib/supabase';

interface QuizPreviewProps {
  quiz: Quiz;
  onBack: () => void;
  onStartQuiz: () => void;
}

export const QuizPreview: React.FC<QuizPreviewProps> = ({ quiz, onBack, onStartQuiz }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAttempts, setUserAttempts] = useState(0);

  useEffect(() => {
    loadQuizDetails();
  }, [quiz.id]);

  const loadQuizDetails = async () => {
    try {
      // Load questions count and sample questions
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .limit(3); // Show first 3 questions as preview

      if (questionsData) {
        setQuestions(questionsData);
      }

      // Load user attempts count (if user is logged in)
      // This would need user context
    } catch (error) {
      console.error('Error loading quiz details:', error);
    } finally {
      setLoading(false);
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
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Quizzes</span>
          </button>
        </div>

        {/* Quiz Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-2xl p-8 border border-gray-700 mb-8"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-3">{quiz.title}</h1>
              <p className="text-gray-300 text-lg mb-4">{quiz.description}</p>
              
              <div className="flex items-center space-x-6 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{quiz.category}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>{questions.length} questions</span>
                </div>
                {quiz.time_limit && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{quiz.time_limit} minutes</span>
                  </div>
                )}
                {quiz.max_attempts && (
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Max {quiz.max_attempts} attempts</span>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={onStartQuiz}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl flex items-center space-x-3 transition-all transform hover:scale-105 shadow-lg"
            >
              <Play className="w-6 h-6" />
              <span className="text-lg font-semibold">Start Quiz</span>
            </button>
          </div>

          {/* Quiz Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-700/50 rounded-xl">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{questions.length}</p>
              <p className="text-gray-400 text-sm">Total Questions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">
                {quiz.time_limit ? `${quiz.time_limit}min` : '∞'}
              </p>
              <p className="text-gray-400 text-sm">Time Limit</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">
                {quiz.max_attempts || '∞'}
              </p>
              <p className="text-gray-400 text-sm">Max Attempts</p>
            </div>
          </div>
        </motion.div>

        {/* Sample Questions Preview */}
        {questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-2xl p-8 border border-gray-700"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Eye className="w-6 h-6 mr-3 text-blue-400" />
              Sample Questions
            </h2>
            
            <div className="space-y-6">
              {questions.slice(0, 3).map((question, index) => (
                <div key={question.id} className="border border-gray-700 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Question {index + 1}
                    </h3>
                    <span className="bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-300">
                      {question.category}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 mb-4 leading-relaxed">
                    {question.question}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="p-3 bg-gray-700/50 rounded-lg border border-gray-600"
                      >
                        <span className="text-gray-300">{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {questions.length > 3 && (
                <div className="text-center py-4">
                  <p className="text-gray-400">
                    And {questions.length - 3} more questions...
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-blue-900/20 rounded-xl p-6 border border-blue-700"
        >
          <h3 className="text-lg font-semibold text-blue-300 mb-4">Quiz Instructions</h3>
          <ul className="space-y-2 text-blue-200">
            <li>• Read each question carefully before selecting your answer</li>
            <li>• You can navigate between questions using the Previous/Next buttons</li>
            <li>• Review your answers before submitting the quiz</li>
            {quiz.time_limit && (
              <li>• You have {quiz.time_limit} minutes to complete this quiz</li>
            )}
            {quiz.max_attempts && (
              <li>• You can attempt this quiz up to {quiz.max_attempts} times</li>
            )}
            <li>• Your results will be available immediately after submission</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
};