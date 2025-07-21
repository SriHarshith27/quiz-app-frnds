import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, BrainCircuit, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { QuizTaker } from './QuizTaker';
import { Quiz, Question } from '../types';

interface PersonalizedLearningPlanProps {
  incorrectAnswers: Array<{
    question: string;
    options: string[];
    userAnswer: number | null;
    correctAnswer: number;
    isCorrect: boolean;
    category: string;
  }>;
  onBack: () => void;
}

export const PersonalizedLearningPlan: React.FC<PersonalizedLearningPlanProps> = ({ 
  incorrectAnswers, 
  onBack 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [learningPlan, setLearningPlan] = useState<string | null>(null);
  const [personalizedQuiz, setPersonalizedQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    const generateLearningPlan = async () => {
      try {
        setLoading(true);
        setError(null);

        // Extract just the question text from incorrectAnswers
        const questionsOnly = incorrectAnswers.map(answer => answer.question);

        // Call the Supabase Edge Function
        const { data, error: functionError } = await supabase.functions.invoke(
          'generate-learning-plan',
          {
            body: {
              incorrectAnswers: questionsOnly
            }
          }
        );

        if (functionError) {
          throw new Error(functionError.message || 'Failed to generate learning plan');
        }

        if (!data) {
          throw new Error('No data received from learning plan service');
        }

        // Update learning plan
        setLearningPlan(data.learningPlan);

        // Create personalized quiz from the returned questions
        if (data.newQuizQuestions && data.newQuizQuestions.length > 0) {
          const quizQuestions: Question[] = data.newQuizQuestions.map((q: any, index: number) => ({
            id: `personalized-${index}`,
            quiz_id: 'personalized-quiz',
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            category: 'Review'
          }));

          const quiz: Quiz = {
            id: 'personalized-quiz',
            title: 'Personalized Follow-up Quiz',
            description: 'A quiz tailored to help you understand the concepts you missed',
            questions: quizQuestions,
            category: 'Review',
            time_limit: 300, // 5 minutes
            created_by: 'ai-assistant',
            created_at: new Date().toISOString()
          };

          setPersonalizedQuiz(quiz);
        }

      } catch (err) {
        console.error('Error generating learning plan:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    generateLearningPlan();
  }, [incorrectAnswers]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Generating Your Personalized Learning Plan
          </h2>
          <p className="text-gray-400">
            Our AI is analyzing your mistakes and creating a tailored study guide...
          </p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-6"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </motion.div>
      </div>
    );
  }

  // Main content
  return (
    <div className="min-h-screen bg-gray-900 py-6">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group px-3 py-2 touch-target"
        >
          <ArrowLeft className="w-5 h-5 group-hover:transform group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm sm:text-base">Back to Results</span>
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6 sm:py-8"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Personalized Learning Plan</h1>
          <p className="text-gray-400 text-base sm:text-lg px-4">AI-generated study guide tailored to help you master the concepts you missed</p>
        </motion.div>

        {/* Learning Plan Section */}
        {learningPlan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 p-4 sm:p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Study Materials</h2>
                  <p className="text-gray-400 text-sm sm:text-base">Comprehensive explanations to help you understand the concepts</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <div 
                className="learning-plan-content space-y-6"
                dangerouslySetInnerHTML={{ __html: learningPlan }}
              />
            </div>
            
            <style>{`
              .learning-plan-content {
                line-height: 1.8;
              }
              
              .learning-plan-content h1,
              .learning-plan-content h2 {
                color: #60a5fa !important;
                font-size: 1.75rem !important;
                font-weight: 700 !important;
                margin-bottom: 1.25rem !important;
                margin-top: 2.5rem !important;
                padding-bottom: 0.5rem !important;
                border-bottom: 2px solid #374151 !important;
              }
              
              .learning-plan-content h1:first-child,
              .learning-plan-content h2:first-child {
                margin-top: 0 !important;
              }
              
              .learning-plan-content h3 {
                color: #93c5fd !important;
                font-size: 1.375rem !important;
                font-weight: 600 !important;
                margin-bottom: 1rem !important;
                margin-top: 2rem !important;
              }
              
              .learning-plan-content h4 {
                color: #bfdbfe !important;
                font-size: 1.125rem !important;
                font-weight: 600 !important;
                margin-bottom: 0.75rem !important;
                margin-top: 1.5rem !important;
              }
              
              .learning-plan-content p {
                color: #e5e7eb !important;
                line-height: 1.7 !important;
                margin-bottom: 1.25rem !important;
                text-align: justify !important;
              }
              
              .learning-plan-content ul,
              .learning-plan-content ol {
                color: #e5e7eb !important;
                margin-bottom: 1.5rem !important;
                padding-left: 2rem !important;
                background-color: rgba(55, 65, 81, 0.3) !important;
                border-radius: 0.5rem !important;
                padding: 1.25rem 2rem !important;
              }
              
              .learning-plan-content li {
                margin-bottom: 0.75rem !important;
                line-height: 1.6 !important;
                position: relative !important;
              }
              
              .learning-plan-content li::marker {
                color: #60a5fa !important;
                font-weight: bold !important;
              }
              
              .learning-plan-content strong,
              .learning-plan-content b {
                color: #fcd34d !important;
                font-weight: 700 !important;
                background-color: rgba(251, 191, 36, 0.1) !important;
                padding: 0.125rem 0.25rem !important;
                border-radius: 0.25rem !important;
              }
              
              .learning-plan-content em,
              .learning-plan-content i {
                color: #6ee7b7 !important;
                font-style: italic !important;
                background-color: rgba(52, 211, 153, 0.1) !important;
                padding: 0.125rem 0.25rem !important;
                border-radius: 0.25rem !important;
              }
              
              .learning-plan-content code {
                background-color: #1f2937 !important;
                color: #fbbf24 !important;
                padding: 0.375rem 0.75rem !important;
                border-radius: 0.5rem !important;
                font-family: 'JetBrains Mono', 'Monaco', 'Consolas', monospace !important;
                font-size: 0.875rem !important;
                border: 1px solid #374151 !important;
                display: inline-block !important;
                margin: 0.125rem !important;
              }
              
              .learning-plan-content pre {
                background-color: #111827 !important;
                border: 1px solid #374151 !important;
                border-radius: 0.75rem !important;
                padding: 1.5rem !important;
                overflow-x: auto !important;
                margin: 1.5rem 0 !important;
                position: relative !important;
              }
              
              .learning-plan-content pre code {
                background-color: transparent !important;
                padding: 0 !important;
                border-radius: 0 !important;
                border: none !important;
                display: block !important;
                margin: 0 !important;
                color: #d1d5db !important;
              }
              
              .learning-plan-content blockquote {
                border-left: 4px solid #60a5fa !important;
                background: linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(59, 130, 246, 0.1)) !important;
                padding: 1.5rem !important;
                margin: 1.5rem 0 !important;
                border-radius: 0.75rem !important;
                color: #dbeafe !important;
                font-style: italic !important;
                position: relative !important;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
              }
              
              .learning-plan-content blockquote::before {
                content: '"' !important;
                font-size: 3rem !important;
                color: #60a5fa !important;
                position: absolute !important;
                top: -0.5rem !important;
                left: 1rem !important;
                opacity: 0.3 !important;
              }
              
              .learning-plan-content table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 1.5rem 0 !important;
                background-color: #374151 !important;
                border-radius: 0.75rem !important;
                overflow: hidden !important;
              }
              
              .learning-plan-content th,
              .learning-plan-content td {
                padding: 0.75rem 1rem !important;
                text-align: left !important;
                border-bottom: 1px solid #4b5563 !important;
                color: #e5e7eb !important;
              }
              
              .learning-plan-content th {
                background-color: #1f2937 !important;
                font-weight: 600 !important;
                color: #60a5fa !important;
              }
              
              .learning-plan-content hr {
                border: none !important;
                height: 2px !important;
                background: linear-gradient(90deg, transparent, #60a5fa, transparent) !important;
                margin: 2rem 0 !important;
              }
            `}</style>
          </motion.div>
        )}

        {/* Personalized Quiz Section */}
        {personalizedQuiz && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Practice Quiz</h2>
                  <p className="text-gray-400">
                    Test your understanding with {personalizedQuiz.questions?.length || 1} personalized question{(personalizedQuiz.questions?.length || 1) > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <QuizTaker 
                quiz={personalizedQuiz}
                onBack={onBack}
                isPractice={true}
                onComplete={() => {
                  alert('Great job on the practice quiz!');
                  onBack();
                }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
