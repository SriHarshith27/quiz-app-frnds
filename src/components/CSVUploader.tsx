import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, ArrowLeft, Save, Edit3, Clock, Users } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CSVUploaderProps {
  onBack: () => void;
  onSave: () => void;
}

interface ExtractedQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  category: string;
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({ onBack, onSave }) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [timeLimit, setTimeLimit] = useState<number>(30); // Default 30 minutes
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null); // Default unlimited
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'upload' | 'edit'>('upload');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    }
  });

  const parseCSVFile = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const parsedQuestions: ExtractedQuestion[] = [];

      // Skip header row if it exists
      const startIndex = lines[0].toLowerCase().includes('question') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Expected CSV format: Question,Option1,Option2,Option3,Option4,CorrectAnswer,Category
        const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        
        if (columns.length >= 6) {
          const question = columns[0];
          const options = [columns[1], columns[2], columns[3], columns[4]];
          const correctAnswerText = columns[5].toLowerCase();
          const questionCategory = columns[6] || category;

          // Find correct answer index
          let correctAnswer = 0;
          if (correctAnswerText === 'b' || correctAnswerText === '2') correctAnswer = 1;
          else if (correctAnswerText === 'c' || correctAnswerText === '3') correctAnswer = 2;
          else if (correctAnswerText === 'd' || correctAnswerText === '4') correctAnswer = 3;

          parsedQuestions.push({
            question,
            options,
            correct_answer: correctAnswer,
            category: questionCategory
          });
        }
      }

      setQuestions(parsedQuestions);
      setStep('edit');
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Failed to parse CSV file. Please check the format.');
    } finally {
      setProcessing(false);
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

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!quizTitle.trim() || questions.length === 0) {
      alert('Please provide a quiz title and at least one question');
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
          title: quizTitle.trim(),
          description: quizDescription.trim(),
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

  if (step === 'upload') {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors px-3 py-2 touch-target"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm sm:text-base">Back to Dashboard</span>
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-700">
          <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6 text-center">Upload CSV File</h3>
          
          <div className="mb-4 sm:mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-700">
            <h4 className="text-blue-300 font-medium mb-2 text-sm sm:text-base">CSV Format Required:</h4>
            <p className="text-blue-200 text-xs sm:text-sm mb-2 break-all">
              Question,Option1,Option2,Option3,Option4,CorrectAnswer,Category
            </p>
            <p className="text-blue-200 text-xs">
              CorrectAnswer should be: A/1, B/2, C/3, or D/4
            </p>
          </div>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-colors touch-target ${
              isDragActive
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            
            {isDragActive ? (
              <p className="text-blue-400 text-lg">Drop the CSV file here...</p>
            ) : (
              <div>
                <p className="text-gray-300 text-lg mb-2">
                  Drag & drop a CSV file here, or click to select
                </p>
                <p className="text-gray-500 text-sm">
                  Supported format: CSV
                </p>
              </div>
            )}
          </div>

          {file && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-gray-700 rounded-lg"
            >
              <div className="flex items-center space-x-3 mb-4">
                <FileText className="w-6 h-6 text-blue-400" />
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-gray-400 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              
              <button
                onClick={parseCSVFile}
                disabled={processing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {processing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Edit3 className="w-5 h-5" />
                    <span>Parse Questions</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep('upload')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Upload</span>
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
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
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
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Enter quiz description"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">
            Review & Edit Questions ({questions.length} found)
          </h3>
        </div>
        
        {questions.map((question, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-white">Question {index + 1}</h4>
              <button
                onClick={() => removeQuestion(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                Remove
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Question</label>
                <textarea
                  value={question.question}
                  onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
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
                        onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => updateQuestion(index, 'correct_answer', optionIndex)}
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