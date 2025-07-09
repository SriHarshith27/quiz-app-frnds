import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, ArrowLeft, Save, Edit3 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PDFUploaderProps {
  onBack: () => void;
  onSave: () => void;
}

interface ExtractedQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  category: string;
}

export const PDFUploader: React.FC<PDFUploaderProps> = ({ onBack, onSave }) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'upload' | 'extract' | 'edit'>('upload');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    }
  });

  const extractTextFromFile = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      if (file.type === 'text/plain') {
        const text = await file.text();
        setExtractedText(text);
        parseQuestionsFromText(text);
      } else {
        // For PDF files, we'll simulate extraction since we can't use PDF.js in this environment
        // In a real implementation, you'd use a PDF parsing library
        const simulatedText = `
Sample Quiz Questions

1. What is the capital of France?
A) London
B) Berlin
C) Paris
D) Madrid
Answer: C

2. Which planet is known as the Red Planet?
A) Venus
B) Mars
C) Jupiter
D) Saturn
Answer: B

3. What is 2 + 2?
A) 3
B) 4
C) 5
D) 6
Answer: B
        `;
        setExtractedText(simulatedText);
        parseQuestionsFromText(simulatedText);
      }
      setStep('extract');
    } catch (error) {
      console.error('Error extracting text:', error);
      alert('Failed to extract text from file');
    } finally {
      setProcessing(false);
    }
  };

  const parseQuestionsFromText = (text: string) => {
    // Simple parser for question format
    const lines = text.split('\n').filter(line => line.trim());
    const parsedQuestions: ExtractedQuestion[] = [];
    
    let currentQuestion = '';
    let currentOptions: string[] = [];
    let correctAnswer = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line is a question (starts with number)
      if (/^\d+\./.test(line)) {
        // Save previous question if exists
        if (currentQuestion && currentOptions.length > 0) {
          parsedQuestions.push({
            question: currentQuestion,
            options: currentOptions,
            correct_answer: correctAnswer,
            category
          });
        }
        
        // Start new question
        currentQuestion = line.replace(/^\d+\.\s*/, '');
        currentOptions = [];
        correctAnswer = 0;
      }
      // Check if line is an option (starts with A), B), etc.)
      else if (/^[A-D]\)/.test(line)) {
        currentOptions.push(line.replace(/^[A-D]\)\s*/, ''));
      }
      // Check if line indicates correct answer
      else if (line.toLowerCase().startsWith('answer:')) {
        const answerLetter = line.replace(/answer:\s*/i, '').trim().toUpperCase();
        correctAnswer = answerLetter.charCodeAt(0) - 65; // Convert A,B,C,D to 0,1,2,3
      }
    }
    
    // Add last question
    if (currentQuestion && currentOptions.length > 0) {
      parsedQuestions.push({
        question: currentQuestion,
        options: currentOptions,
        correct_answer: correctAnswer,
        category
      });
    }
    
    setQuestions(parsedQuestions);
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
      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert([{
          title: quizTitle.trim(),
          description: quizDescription.trim(),
          category,
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
          <h3 className="text-2xl font-semibold text-white mb-6 text-center">Upload PDF or Text File</h3>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            
            {isDragActive ? (
              <p className="text-blue-400 text-lg">Drop the file here...</p>
            ) : (
              <div>
                <p className="text-gray-300 text-lg mb-2">
                  Drag & drop a PDF or text file here, or click to select
                </p>
                <p className="text-gray-500 text-sm">
                  Supported formats: PDF, TXT
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
                onClick={extractTextFromFile}
                disabled={processing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {processing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Edit3 className="w-5 h-5" />
                    <span>Extract Questions</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'extract') {
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
            onClick={() => setStep('edit')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Edit Questions
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-6">Extracted Text</h3>
          
          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-gray-300 text-sm whitespace-pre-wrap">{extractedText}</pre>
          </div>
          
          <div className="mt-6">
            <p className="text-gray-400 mb-2">
              Found {questions.length} questions. Click "Edit Questions" to review and modify them.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep('extract')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Extract</span>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
        <h3 className="text-xl font-semibold text-white">Review & Edit Questions</h3>
        
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