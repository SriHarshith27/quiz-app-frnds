import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Save, ArrowLeft, Clock, Users } from 'lucide-react';
import { Question } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface QuizCreatorProps {
  onBack: () => void;
  onSave: () => void;
}

export const QuizCreator: React.FC<QuizCreatorProps> = ({ onBack, onSave }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [timeLimit, setTimeLimit] = useState<number>(30); // Default 30 minutes
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null); // Default unlimited
  const [questions, setQuestions] = useState<Omit<Question, 'id' | 'quiz_id'>[]>([
    {
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      category: 'General'
    }
  ]);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      category
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const handleSave = async () => {
    if (!title.trim() || questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()))) {
      alert('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      // Set admin context
      if (user) {
        await supabase.rpc('set_config', {
          setting_name: 'app.current_user',
          setting_value: user.username
        });
      }

      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert([{
          title: title.trim(),
          description: description.trim(),
          category,
          time_limit: timeLimit,
          max_attempts: maxAttempts,
          created_by: user?.id
        }])
        .select()
        .single();

      if (quizError) throw quizError;

      // Create questions
      const questionsToInsert = questions.map(q => ({
        ...q,
        quiz_id: quiz.id
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      onSave();
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Failed to save quiz. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Saving...' : 'Save Quiz'}</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-6">Quiz Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quiz title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="General">General</option>
              <option value="Science">Science</option>
              <option value="History">History</option>
              <option value="Sports">Sports</option>
              <option value="Technology">Technology</option>
              <option value="Entertainment">Entertainment</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Time Limit (minutes)
            </label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value) || 30)}
              min="5"
              max="180"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="30"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
              <Users className="w-4 h-4 mr-1" />
              Max Attempts
            </label>
            <input
              type="number"
              value={maxAttempts || ''}
              onChange={(e) => setMaxAttempts(e.target.value ? parseInt(e.target.value) : null)}
              min="1"
              max="10"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Unlimited"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Enter quiz description"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Questions</h3>
          <button
            onClick={addQuestion}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Question</span>
          </button>
        </div>

        {questions.map((question, questionIndex) => (
          <motion.div
            key={questionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-white">Question {questionIndex + 1}</h4>
              {questions.length > 1 && (
                <button
                  onClick={() => removeQuestion(questionIndex)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Question</label>
                <textarea
                  value={question.question}
                  onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Enter your question"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Option {optionIndex + 1}
                      {question.correct_answer === optionIndex && (
                        <span className="text-green-400 ml-2">(Correct)</span>
                      )}
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Option ${optionIndex + 1}`}
                      />
                      <button
                        onClick={() => updateQuestion(questionIndex, 'correct_answer', optionIndex)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          question.correct_answer === optionIndex
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};