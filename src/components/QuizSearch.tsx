import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X, Clock, Users, BookOpen } from 'lucide-react';
import { Quiz } from '../types';

interface QuizSearchProps {
  quizzes: Quiz[];
  onFilteredQuizzes: (filtered: Quiz[]) => void;
}

export const QuizSearch: React.FC<QuizSearchProps> = ({ quizzes, onFilteredQuizzes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [timeFilter, setTimeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const categories = [...new Set(quizzes.map(quiz => quiz.category))];

  useEffect(() => {
    let filtered = quizzes;

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

    onFilteredQuizzes(filtered);
  }, [searchTerm, selectedCategory, timeFilter, quizzes, onFilteredQuizzes]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setTimeFilter('');
  };

  const hasActiveFilters = searchTerm || selectedCategory || timeFilter;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search quizzes by title or description..."
          className="w-full pl-12 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors ${
            showFilters ? 'text-blue-400 bg-blue-900/30' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                <BookOpen className="w-4 h-4 mr-2" />
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Time Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Duration
              </label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Duration</option>
                <option value="quick">Quick (≤15 min)</option>
                <option value="medium">Medium (16-45 min)</option>
                <option value="long">Long (>45 min)</option>
                <option value="unlimited">Unlimited Time</option>
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
                    Search: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-2 hover:text-blue-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedCategory && (
                  <span className="bg-green-900/30 text-green-300 px-3 py-1 rounded-full text-sm flex items-center">
                    Category: {selectedCategory}
                    <button
                      onClick={() => setSelectedCategory('')}
                      className="ml-2 hover:text-green-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {timeFilter && (
                  <span className="bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full text-sm flex items-center">
                    Duration: {timeFilter}
                    <button
                      onClick={() => setTimeFilter('')}
                      className="ml-2 hover:text-purple-200"
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
    </div>
  );
};