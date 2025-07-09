import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle } from 'lucide-react';
import { Quiz, UserAnswer } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface QuizTakerProps {
  quiz: Quiz;
  onBack: () => void;
  onComplete: (attemptId: string) => void;
}

export const QuizTaker: React.FC<QuizTakerProps> = ({ quiz, onBack, onComplete }) => {
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeStarted] = useState(Date.now());
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    // Load questions for this quiz
    loadQuestions();
  }, [quiz.id]);

  const loadQuestions = async () => {
    try {
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('created_at');

      if (questions) {
        quiz.questions = questions;
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;

    const question = quiz.questions[currentQuestion];
    const isCorrect = selectedAnswer === question.correct_answer;

    const newAnswer: UserAnswer = {
      question_id: question.id,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      category: question.category
    };

    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestion] = newAnswer;
    setAnswers(updatedAnswers);

    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setShowReview(true);
    }
  };

  const handleSubmit = async () => {
    const score = answers.filter(a => a.is_correct).length;
    const timeCompleted = Date.now();
    const timeTaken = Math.round((timeCompleted - timeStarted) / 1000);

    try {
      const { data: attempt, error } = await supabase
        .from('quiz_attempts')
        .insert([{
          user_id: user?.id,
          quiz_id: quiz.id,
          score,
          total_questions: quiz.questions.length,
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

  const goToQuestion = (index: number) => {
    setCurrentQuestion(index);
    setSelectedAnswer(answers[index]?.selected_answer ?? null);
    setShowReview(false);
  };

  if (!quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading questions...</p>
      </div>
    );
  }

  if (showReview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowReview(false)}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Quiz</span>
          </button>
          
          <button
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Submit Quiz</span>
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-6">Review Your Answers</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            {quiz.questions.map((_, index) => {
              const answer = answers[index];
              return (
                <button
                  key={index}
                  onClick={() => goToQuestion(index)}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    answer
                      ? answer.is_correct
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="text-center">
            <p className="text-gray-300 mb-2">
              Score: {answers.filter(a => a.is_correct).length} / {quiz.questions.length}
            </p>
            <p className="text-gray-400 text-sm">
              {Math.round((answers.filter(a => a.is_correct).length / quiz.questions.length) * 100)}% correct
            </p>
          </div>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

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
        
        <div className="flex items-center space-x-4 text-gray-400">
          <Clock className="w-5 h-5" />
          <span>{Math.floor((Date.now() - timeStarted) / 60000)}:{String(Math.floor(((Date.now() - timeStarted) % 60000) / 1000)).padStart(2, '0')}</span>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">{quiz.title}</h3>
            <span className="text-gray-400 text-sm">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="mb-8">
          <h4 className="text-xl text-white mb-6">{question.question}</h4>
          
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <motion.button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full p-4 text-left rounded-lg border transition-all ${
                  selectedAnswer === index
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswer === index
                      ? 'border-white bg-white'
                      : 'border-gray-400'
                  }`}>
                    {selectedAnswer === index && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setShowReview(true)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Review Answers
          </button>
          
          <button
            onClick={handleNext}
            disabled={selectedAnswer === null}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
          >
            {currentQuestion === quiz.questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};