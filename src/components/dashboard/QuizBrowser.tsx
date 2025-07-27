import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Search, BookOpen, Clock, Users, Filter } from 'lucide-react';
import { Quiz } from '../../types';
import { useQuizzes } from '../../hooks/useQueries';

interface QuizBrowserProps {
  onTakeQuiz?: (quiz: Quiz) => void;
}

export const QuizBrowser: React.FC<QuizBrowserProps> = ({ onTakeQuiz }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  
  const { data: quizzes, isLoading } = useQuizzes();

  // Filter and sort quizzes
  const filteredQuizzes = React.useMemo(() => {
    if (!quizzes) return [];

    let filtered = [...quizzes];

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(quiz => 
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(quiz => quiz.category === selectedCategory);
    }

    // Filter by availability (start time)
    const now = new Date();
    filtered = filtered.filter((quiz: any) => {
      const quizStartTime = quiz.start_time ? new Date(quiz.start_time) : null;
      return !quizStartTime || now >= quizStartTime;
    });

    // Sort
    switch (sortBy) {
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'category':
        filtered.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'latest':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return filtered;
  }, [quizzes, searchTerm, selectedCategory, sortBy]);

  // Get unique categories
  const categories = React.useMemo(() => {
    if (!quizzes) return [];
    return [...new Set(quizzes.map((quiz: any) => quiz.category))];
  }, [quizzes]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Available Quizzes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-600 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-600 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-600 rounded w-2/3 mb-4"></div>
              <div className="h-10 bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Available Quizzes</h2>
        <p className="text-gray-400">{filteredQuizzes.length} quizzes available</p>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-gray-700/30 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-600/50 border border-gray-500/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-600/50 border border-gray-500/50 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-gray-600/50 border border-gray-500/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="latest">Latest First</option>
            <option value="title">Title A-Z</option>
            <option value="category">Category</option>
          </select>
        </div>
      </div>

      {/* Quiz Grid */}
      {filteredQuizzes.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-700/30 rounded-lg p-8">
            <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No quizzes found</h3>
            <p className="text-gray-400">
              {searchTerm || selectedCategory 
                ? 'Try adjusting your search or filter criteria'
                : 'No quizzes are available at the moment'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz: any, index: number) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-700/50 hover:bg-gray-700/70 rounded-lg p-6 transition-all group"
            >
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full text-xs">
                    {quiz.category}
                  </span>
                  <div className="flex items-center space-x-1 text-gray-400">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">{quiz.users?.username}</span>
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {quiz.title}
                </h3>
                
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {quiz.description}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                <div className="flex items-center space-x-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{quiz.questions?.[0]?.count || 0} questions</span>
                </div>
                {quiz.time_limit && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{quiz.time_limit} min</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onTakeQuiz?.(quiz)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-all transform hover:scale-105"
              >
                <Play className="w-4 h-4" />
                <span>Take Quiz</span>
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
