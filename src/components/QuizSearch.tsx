import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Clock, Users, BookOpen, Star, TrendingUp } from 'lucide-react';
import { Quiz } from '../types';

interface QuizSearchProps {
  quizzes: Quiz[];
  onFilteredQuizzes: (filtered: Quiz[]) => void;
}

export const QuizSearch: React.FC<QuizSearchProps> = ({ quizzes, onFilteredQuizzes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [timeFilter, setTimeFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  const categories = [...new Set(quizzes.map(quiz => quiz.category))];

  useEffect(() => {
    let filtered = [...quizzes];

    // Search by title and description
    if (searchTerm) {
      filtered = filtered.filter(quiz =>
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(quiz => quiz.category === selectedCategory);
    }

    // Filter by time limit
    if (timeFilter) {
      switch (timeFilter) {
        case 'quick':
          filtered = filtered.filter(quiz => quiz.time_limit && quiz.time_limit <= 15);
          break;
        case 'medium':
          filtered = filtered.filter(quiz => quiz.time_limit && quiz.time_limit > 15 && quiz.time_limit <= 45);
          break;
        case 'long':
          filtered = filtered.filter(quiz => quiz.time_limit && quiz.time_limit > 45);
          break;
        case 'unlimited':
          filtered = filtered.filter(quiz => !quiz.time_limit);
          break;
      }
    }

    // Filter by difficulty (simulated based on question count and time limit)
    if (difficultyFilter) {
      filtered = filtered.filter(quiz => {
        const questionCount = quiz.questions?.length || 0;
        const timeLimit = quiz.time_limit || 60;
        const difficulty = questionCount > 20 || timeLimit < 30 ? 'hard' : 
                          questionCount > 10 || timeLimit < 60 ? 'medium' : 'easy';
        return difficulty === difficultyFilter;
      });
    }

    // Sort results
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'questions':
        filtered.sort((a, b) => (b.questions?.length || 0) - (a.questions?.length || 0));
        break;
    }

    onFilteredQuizzes(filtered);
  }, [searchTerm, selectedCategory, timeFilter, difficultyFilter, sortBy, quizzes, onFilteredQuizzes]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setTimeFilter('');
    setDifficultyFilter('');
    setSortBy('newest');
  };

  const hasActiveFilters = searchTerm || selectedCategory || timeFilter || difficultyFilter || sortBy !== 'newest';

  return (
    <div className="space-y-4">
      {/* Mobile-optimized Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search quizzes..."
          className="w-full pl-12 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors touch-target ${
            showFilters ? 'text-blue-400 bg-blue-900/30' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Filter Chips - Mobile Friendly */}
      <div className="flex flex-wrap gap-2">
        {categories.slice(0, 4).map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(selectedCategory === category ? '' : category)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors touch-target ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {category}
          </button>
        ))}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1 rounded-full text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors touch-target"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-white">Advanced Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors touch-target"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm">Clear All</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Duration Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Duration
                </label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Any Duration</option>
                  <option value="quick">Quick (≤15 min)</option>
                  <option value="medium">Medium (16-45 min)</option>
                  <option value="long">Long (>45 min)</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Star className="w-4 h-4 mr-2" />
                  Difficulty
                </label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Any Difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Alphabetical</option>
                  <option value="questions">Most Questions</option>
                </select>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Active filters:</p>
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm flex items-center">
                      Search: "{searchTerm.length > 20 ? searchTerm.substring(0, 20) + '...' : searchTerm}"
                      <button
                        onClick={() => setSearchTerm('')}
                        className="ml-2 hover:text-blue-200 touch-target"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="bg-green-900/30 text-green-300 px-3 py-1 rounded-full text-sm flex items-center">
                      {selectedCategory}
                      <button
                        onClick={() => setSelectedCategory('')}
                        className="ml-2 hover:text-green-200 touch-target"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {timeFilter && (
                    <span className="bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full text-sm flex items-center">
                      {timeFilter}
                      <button
                        onClick={() => setTimeFilter('')}
                        className="ml-2 hover:text-purple-200 touch-target"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {difficultyFilter && (
                    <span className="bg-yellow-900/30 text-yellow-300 px-3 py-1 rounded-full text-sm flex items-center">
                      {difficultyFilter}
                      <button
                        onClick={() => setDifficultyFilter('')}
                        className="ml-2 hover:text-yellow-200 touch-target"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};