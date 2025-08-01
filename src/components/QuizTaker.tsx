import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Quiz, UserAnswer } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface QuizTakerProps {
  quiz: Quiz;
  onBack: () => void;
  onComplete: (attemptId?: string) => void;
  isPractice?: boolean;
}

export const QuizTaker: React.FC<QuizTakerProps> = ({ quiz, onBack, onComplete, isPractice }) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeStarted] = useState(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeUp, setTimeUp] = useState(false);

  useEffect(() => {
    // Check quiz availability based on start_time before proceeding
    const now = new Date();
    const quizStartTime = quiz.start_time ? new Date(quiz.start_time) : null;

    if (quizStartTime && now < quizStartTime) {
      alert(`This quiz is scheduled to start on ${quizStartTime.toLocaleString()}. Please try again later.`);
      onBack();
      return;
    }

    // FIX: This condition is now more specific. It checks if the first item in the array has a 'question' property, 
    // ensuring it's a real question object, not a count object.
    if (quiz.questions && quiz.questions.length > 0 && quiz.questions[0].question) {
      setQuestions(quiz.questions);
      setLoading(false);
      return;
    }
    
    loadQuestions(); // Call loadQuestions only if available
    
    if (quiz.time_limit) {
      setTimeRemaining(quiz.time_limit * 60);
    }
  }, [quiz.id, quiz.questions]); // Ensure quiz object changes re-trigger this effect

  useEffect(() => {
    if (timeRemaining > 0 && !showReview && !timeUp) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimeUp(true);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, showReview, timeUp]);

  const loadQuestions = async () => {
    try {
      const { data: questionsData, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('created_at');

      if (error) throw error;

      if (questionsData && questionsData.length > 0) {
        setQuestions(questionsData);
      } else {
        alert('No questions found for this quiz');
        onBack();
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      alert('Failed to load questions');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;

    const question = questions[currentQuestion];
    if (!question) return;
    
    const isCorrect = selectedAnswer === question.correct_answer;

    const newAnswer: UserAnswer = {
      question_id: question.id,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      category: question.category,
      question: question.question,
      options: question.options,
      correct_answer: question.correct_answer
    };

    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestion] = newAnswer;
    setAnswers(updatedAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      if (isPractice) {
        onComplete();
        return;
      }
      setShowReview(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(answers[currentQuestion - 1]?.selected_answer ?? null);
    }
  };

  const handleSubmit = async () => {
    if (isPractice) return;
    
    if (quiz.max_attempts) {
      const { data: existingAttempts } = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('user_id', user?.id)
        .eq('quiz_id', quiz.id);
      
      if (existingAttempts && existingAttempts.length >= quiz.max_attempts) {
        alert('You have reached the maximum number of attempts for this quiz.');
        onBack();
        return;
      }
    }

    const score = answers.filter(a => a.is_correct).length;
    const timeCompleted = Date.now();
    const timeTaken = Math.round((timeCompleted - timeStarted) / 1000);

    try {
      if (user) {
        await supabase.rpc('set_config', {
          setting_name: 'app.current_user',
          setting_value: user.username
        });
      }

      const { data: attempt, error } = await supabase
        .from('quiz_attempts')
        .insert([{
          user_id: user?.id,
          quiz_id: quiz.id,
          score,
          total_questions: questions.length,
          answers: JSON.stringify(answers),
          time_taken: timeTaken
        }])
        .select()
        .single();

      if (error) throw error;
      onComplete(attempt.id);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Failed to submit quiz. Please try again.');
    }
  };

  const handleAutoSubmit = async () => {
    const score = answers.filter(a => a.is_correct).length;
    const timeCompleted = Date.now();
    const timeTaken = Math.round((timeCompleted - timeStarted) / 1000);

    try {
      if (user) {
        await supabase.rpc('set_config', {
          setting_name: 'app.current_user',
          setting_value: user.username
        });
      }

      const { data: attempt, error } = await supabase
        .from('quiz_attempts')
        .insert([{
          user_id: user?.id,
          quiz_id: quiz.id,
          score,
          total_questions: questions.length,
          answers: JSON.stringify(answers),
          time_taken: timeTaken
        }])
        .select()
        .single();

      if (error) throw error;
      onComplete(attempt.id);
    } catch (error) {
      console.error('Error auto-submitting quiz:', error);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestion(index);
    setSelectedAnswer(answers[index]?.selected_answer ?? null);
    setShowReview(false);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-300 text-lg">Loading your quiz...</p>
        </div>
      </div>
    );
  }

  if (timeUp) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Time's Up!</h2>
          <p className="text-gray-400 mb-8 text-lg">Your quiz has been automatically submitted.</p>
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (showReview) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <button
              onClick={() => setShowReview(false)}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors px-3 py-2 touch-target"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm sm:text-base">Back to Quiz</span>
            </button>
            
            <button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-3 rounded-lg flex items-center space-x-2 transition-colors font-medium min-h-[44px] touch-target w-full sm:w-auto justify-center"
            >
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm sm:text-base">Submit Quiz</span>
            </button>
          </div>

          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Review Your Answers</h2>
              <p className="text-gray-400">Make sure you're satisfied with your responses before submitting</p>
            </div>
            
            <div className="grid grid-cols-5 md:grid-cols-10 gap-3 mb-8">
              {questions.map((_, index) => {
                const answer = answers[index];
                return (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    className={`aspect-square rounded-lg text-sm font-bold transition-all hover:scale-105 ${
                      answer
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="bg-gray-700 rounded-xl p-6 text-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-2xl font-bold text-white">{answers.length}</p>
                  <p className="text-gray-400">Questions Answered</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{questions.length - answers.length}</p>
                  <p className="text-gray-400">Questions Remaining</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{Math.round((answers.length / questions.length) * 100)}%</p>
                  <p className="text-gray-400">Completion</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  if (!question || !question.options) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <p className="text-gray-300 text-lg">Preparing next question...</p>
          </div>
        </div>
      );
  }
  
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors px-3 py-2 touch-target"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm sm:text-base">Exit Quiz</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className={`font-mono text-base sm:text-lg ${
              quiz.time_limit && timeRemaining < 300 ? 'text-red-400' : 'text-gray-300'
            }`}>
              {quiz.time_limit ? (
                formatTime(timeRemaining)
              ) : (
                formatTime(Math.floor((Date.now() - timeStarted) / 1000))
              )}
            </span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="h-2 bg-gray-700">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {quiz.time_limit && (
            <div className="h-1 bg-gray-700">
              <motion.div
                className={`h-full transition-colors ${
                  timeRemaining < 300 ? 'bg-red-500' : 'bg-green-500'
                }`}
                initial={{ width: '100%' }}
                animate={{ width: `${(timeRemaining / (quiz.time_limit * 60)) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{quiz.title}</h1>
                <p className="text-gray-400 mt-1 text-sm sm:text-base">{quiz.category}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-gray-500">Question</p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {currentQuestion + 1}<span className="text-gray-400">/{questions.length}</span>
                </p>
              </div>
            </div>

            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-white leading-relaxed mb-6 sm:mb-8">
                {question.question}
              </h2>
              
              <div className="space-y-3 sm:space-y-4">
                {question.options.map((option: string, index: number) => (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full p-4 sm:p-6 text-left rounded-xl border-2 transition-all min-h-[56px] touch-target ${
                      selectedAnswer === index
                        ? 'border-blue-500 bg-blue-900/30 shadow-lg'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedAnswer === index
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-400'
                      }`}>
                        {selectedAnswer === index && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span className={`text-base sm:text-lg ${
                        selectedAnswer === index ? 'text-blue-300 font-medium' : 'text-gray-300'
                      }`}>
                        {option}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-6 border-t border-gray-700 gap-4">
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] touch-target"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm sm:text-base">Previous</span>
                </button>
                
                <button
                  onClick={() => setShowReview(true)}
                  className="px-4 sm:px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors min-h-[44px] touch-target text-sm sm:text-base"
                >
                  Review All
                </button>
              </div>
              
              <button
                onClick={handleNext}
                disabled={selectedAnswer === null}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 sm:px-8 py-3 rounded-lg transition-colors font-medium min-h-[44px] touch-target"
              >
                <span className="text-sm sm:text-base">{currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};