import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Target, TrendingUp, Download, Eye, EyeOff, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { QuizAttempt, Quiz, CategoryPerformance } from '../types';
import { supabase } from '../lib/supabase';
// PersonalizedLearningPlan component for AI-generated learning plans
import { PersonalizedLearningPlan } from './PersonalizedLearningPlan';

interface QuizResultsProps {
  attemptId: string;
  onBack: () => void;
}

interface DetailedAnswer {
  question: string;
  options: string[];
  userAnswer: number | null;
  correctAnswer: number;
  isCorrect: boolean;
  category: string;
}

export const QuizResults: React.FC<QuizResultsProps> = ({ attemptId, onBack }) => {
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [detailedAnswers, setDetailedAnswers] = useState<DetailedAnswer[]>([]);
  const [showDetailedAnswers, setShowDetailedAnswers] = useState(false);
  const [showLearningPlan, setShowLearningPlan] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    try {
      // Load attempt
      const { data: attemptData } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (attemptData) {
        setAttempt(attemptData);
        
        // Load quiz
        const { data: quizData } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', attemptData.quiz_id)
          .single();

        if (quizData) {
          setQuiz(quizData);
          
          // Load questions for detailed analysis
          const { data: questions } = await supabase
            .from('questions')
            .select('*')
            .eq('quiz_id', quizData.id)
            .order('created_at');

          if (questions) {
            calculateCategoryPerformance(attemptData.answers, questions);
            generateDetailedAnswers(attemptData.answers, questions);
          }
        }
      }
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCategoryPerformance = (answers: any, questions: any[]) => {
    const userAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;
    const categoryStats: { [key: string]: { correct: number; total: number } } = {};

    questions.forEach((question, index) => {
      const userAnswer = userAnswers.find((a: any) => a.question_id === question.id) || userAnswers[index];
      const category = question.category || 'General';

      if (!categoryStats[category]) {
        categoryStats[category] = { correct: 0, total: 0 };
      }

      categoryStats[category].total++;
      if (userAnswer && userAnswer.is_correct) {
        categoryStats[category].correct++;
      }
    });

    const performance = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      correct: stats.correct,
      total: stats.total,
      percentage: Math.round((stats.correct / stats.total) * 100)
    }));

    setCategoryPerformance(performance);
  };

  const generateDetailedAnswers = (answers: any, questions: any[]) => {
    const userAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;
    
    const detailed = questions.map((question, index) => {
      const userAnswer = userAnswers.find((a: any) => a.question_id === question.id) || userAnswers[index];
      
      return {
        question: question.question,
        options: question.options,
        userAnswer: userAnswer?.selected_answer ?? null,
        correctAnswer: question.correct_answer,
        isCorrect: userAnswer?.is_correct || false,
        category: question.category || 'General'
      };
    });

    setDetailedAnswers(detailed);
  };

  const generateReport = () => {
    if (!attempt || !quiz) return;

    const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
    const strongAreas = categoryPerformance.filter(c => c.percentage >= 80);
    const weakAreas = categoryPerformance.filter(c => c.percentage < 60);

    let reportContent = `Quiz Results Report\n`;
    reportContent += `==================\n\n`;
    reportContent += `Quiz: ${quiz.title}\n`;
    reportContent += `Date: ${new Date(attempt.completed_at).toLocaleDateString()}\n`;
    reportContent += `Time Taken: ${Math.floor(attempt.time_taken / 60)}:${String(attempt.time_taken % 60).padStart(2, '0')}\n\n`;

    reportContent += `Overall Performance\n`;
    reportContent += `------------------\n`;
    reportContent += `Score: ${attempt.score}/${attempt.total_questions} (${percentage}%)\n\n`;

    // Detailed question breakdown
    if (detailedAnswers.length > 0) {
      reportContent += `Detailed Question Analysis\n`;
      reportContent += `-------------------------\n`;
      detailedAnswers.forEach((answer, index) => {
        reportContent += `\nQuestion ${index + 1}: ${answer.isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}\n`;
        reportContent += `Q: ${answer.question}\n`;
        reportContent += `Category: ${answer.category}\n`;
        
        if (answer.userAnswer !== null) {
          reportContent += `Your Answer: ${answer.options[answer.userAnswer]}\n`;
        } else {
          reportContent += `Your Answer: Not answered\n`;
        }
        
        reportContent += `Correct Answer: ${answer.options[answer.correctAnswer]}\n`;
        reportContent += `${'-'.repeat(40)}\n`;
      });
    }

    reportContent += `\nCategory Performance\n`;
    reportContent += `-------------------\n`;
    categoryPerformance.forEach(c => {
      reportContent += `${c.category}: ${c.correct}/${c.total} (${c.percentage}%)\n`;
    });

    reportContent += `\nStrong Areas (≥80%)\n`;
    reportContent += `------------------\n`;
    if (strongAreas.length > 0) {
      strongAreas.forEach(c => reportContent += `• ${c.category} (${c.percentage}%)\n`);
    } else {
      reportContent += `None identified\n`;
    }

    reportContent += `\nAreas for Improvement (<60%)\n`;
    reportContent += `---------------------------\n`;
    if (weakAreas.length > 0) {
      weakAreas.forEach(c => reportContent += `• ${c.category} (${c.percentage}%)\n`);
    } else {
      reportContent += `None identified\n`;
    }

    reportContent += `\nRecommendations\n`;
    reportContent += `--------------\n`;
    if (weakAreas.length > 0) {
      reportContent += `Focus on improving: ${weakAreas.map(c => c.category).join(', ')}\n`;
    } else {
      reportContent += `Great job! Keep up the excellent work across all categories.\n`;
    }

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-results-${quiz.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!attempt || !quiz) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Results not found</p>
      </div>
    );
  }

  const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
  const strongAreas = categoryPerformance.filter(c => c.percentage >= 80);
  const weakAreas = categoryPerformance.filter(c => c.percentage < 60);
  
  // Filter incorrect answers for learning plan
  const incorrectAnswers = detailedAnswers.filter(answer => !answer.isCorrect);

  // Show PersonalizedLearningPlan if requested
  if (showLearningPlan) {
    return (
      <PersonalizedLearningPlan
        incorrectAnswers={incorrectAnswers}
        onBack={() => setShowLearningPlan(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>
        
        <div className="flex space-x-3">
          {incorrectAnswers.length > 0 && (
            <button
              onClick={() => setShowLearningPlan(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 transform hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate My Learning Plan</span>
            </button>
          )}
          
          <button
            onClick={() => setShowDetailedAnswers(!showDetailedAnswers)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            {showDetailedAnswers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showDetailedAnswers ? 'Hide' : 'Show'} Detailed Answers</span>
          </button>
          
          <button
            onClick={generateReport}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Report</span>
          </button>
        </div>
      </div>

      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center"
      >
        <Trophy className={`w-16 h-16 mx-auto mb-4 ${
          percentage >= 80 ? 'text-yellow-500' :
          percentage >= 60 ? 'text-blue-500' :
          'text-gray-500'
        }`} />
        
        <h2 className="text-3xl font-bold text-white mb-2">{quiz.title}</h2>
        <div className="text-6xl font-bold mb-4">
          <span className={
            percentage >= 80 ? 'text-green-400' :
            percentage >= 60 ? 'text-yellow-400' :
            'text-red-400'
          }>
            {percentage}%
          </span>
        </div>
        
        <p className="text-xl text-gray-300 mb-2">
          {attempt.score} out of {attempt.total_questions} correct
        </p>
        
        <p className="text-gray-400">
          Completed in {Math.floor(attempt.time_taken / 60)}:{String(attempt.time_taken % 60).padStart(2, '0')}
        </p>
      </motion.div>

      {/* Detailed Answers Review */}
      {showDetailedAnswers && detailedAnswers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Eye className="w-6 h-6 mr-2 text-blue-400" />
            Detailed Answer Review
          </h3>
          
          <div className="space-y-6">
            {detailedAnswers.map((answer, index) => (
              <div key={index} className="border border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-medium text-white">Question {index + 1}</h4>
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                    answer.isCorrect 
                      ? 'bg-green-900 text-green-300' 
                      : 'bg-red-900 text-red-300'
                  }`}>
                    {answer.isCorrect ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>{answer.isCorrect ? 'Correct' : 'Incorrect'}</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-gray-300 mb-2">{answer.question}</p>
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-400">
                    {answer.category}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {answer.options.map((option: string, optionIndex: number) => (
                    <div
                      key={optionIndex}
                      className={`p-3 rounded-lg border ${
                        optionIndex === answer.correctAnswer && optionIndex === answer.userAnswer
                          ? 'border-green-500 bg-green-900/20 text-green-300' // Correct answer selected
                          : optionIndex === answer.correctAnswer
                          ? 'border-green-500 bg-green-900/10 text-green-400' // Correct answer not selected
                          : optionIndex === answer.userAnswer
                          ? 'border-red-500 bg-red-900/20 text-red-300' // Wrong answer selected
                          : 'border-gray-600 bg-gray-700/50 text-gray-400' // Not selected
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option}</span>
                        <div className="flex items-center space-x-2">
                          {optionIndex === answer.userAnswer && (
                            <span className="text-xs bg-blue-600 px-2 py-1 rounded text-white">
                              Your Answer
                            </span>
                          )}
                          {optionIndex === answer.correctAnswer && (
                            <span className="text-xs bg-green-600 px-2 py-1 rounded text-white">
                              Correct
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {answer.userAnswer === null && (
                  <div className="mt-3 p-2 bg-yellow-900/20 rounded border border-yellow-700">
                    <p className="text-yellow-300 text-sm">⚠️ This question was not answered</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Category Performance */}
      {categoryPerformance.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Target className="w-6 h-6 mr-2 text-blue-400" />
            Category Performance
          </h3>
          
          <div className="space-y-4">
            {categoryPerformance.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">{category.category}</span>
                  <span className="text-gray-400">
                    {category.correct}/{category.total} ({category.percentage}%)
                  </span>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    className={`h-2 rounded-full ${
                      category.percentage >= 80 ? 'bg-green-500' :
                      category.percentage >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${category.percentage}%` }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Strengths and Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Strong Areas (≥80%)
          </h3>
          
          {strongAreas.length > 0 ? (
            <div className="space-y-2">
              {strongAreas.map((area) => (
                <div key={area.category} className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg">
                  <span className="text-green-300">{area.category}</span>
                  <span className="text-green-400 font-medium">{area.percentage}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No strong areas identified. Keep practicing!</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Areas to Improve (&lt;60%)
          </h3>
          
          {weakAreas.length > 0 ? (
            <div className="space-y-2">
              {weakAreas.map((area) => (
                <div key={area.category} className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg">
                  <span className="text-red-300">{area.category}</span>
                  <span className="text-red-400 font-medium">{area.percentage}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">Great job! No weak areas identified.</p>
          )}
        </motion.div>
      </div>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <h3 className="text-lg font-semibold text-blue-400 mb-4">Recommendations</h3>
        
        <div className="space-y-3 text-gray-300">
          {weakAreas.length > 0 ? (
            <>
              <p>Focus on improving your knowledge in: <strong>{weakAreas.map(a => a.category).join(', ')}</strong></p>
              <p>Consider reviewing materials related to these topics and taking practice quizzes.</p>
            </>
          ) : (
            <p>Excellent performance across all categories! Keep up the great work and challenge yourself with more advanced topics.</p>
          )}
          
          {strongAreas.length > 0 && (
            <p>Your strengths in <strong>{strongAreas.map(a => a.category).join(', ')}</strong> show great knowledge in these areas.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};