import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Crown, ChevronDown, Users, Target } from 'lucide-react';
import { useQuizzes, useQuizResults } from '../../hooks/useQueries';

export const Leaderboards: React.FC = () => {
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const { data: quizzes, isLoading: quizzesLoading } = useQuizzes();
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuizResults(selectedQuizId);

  const selectedQuiz = quizzes?.find((quiz: any) => quiz.id === selectedQuizId);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return Crown;
      case 2: return Trophy;
      case 3: return Medal;
      default: return Award;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-orange-400';
      default: return 'text-blue-400';
    }
  };

  const getRankBackground = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
      case 2: return 'bg-gradient-to-r from-gray-400/20 to-gray-600/20 border-gray-400/30';
      case 3: return 'bg-gradient-to-r from-orange-400/20 to-red-500/20 border-orange-400/30';
      default: return 'bg-gray-700/50 border-gray-600/30';
    }
  };

  // Process leaderboard data to get top 10 unique users
  const processedLeaderboard = React.useMemo(() => {
    if (!leaderboardData) return [];
    
    const userScores = new Map();
    leaderboardData.forEach((attempt: any) => {
      const userId = attempt.user_id || attempt.userId;
      const currentBest = userScores.get(userId);
      
      // Calculate percentage score safely
      const score = typeof attempt.score === 'number' 
        ? attempt.score 
        : parseFloat(attempt.score) || 0;
      
      const totalQuestions = attempt.total_questions || attempt.totalQuestions || 10;
      const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
      
      if (!currentBest || percentage > currentBest.percentage) {
        userScores.set(userId, {
          userId,
          username: attempt.users?.username || attempt.username || 'Anonymous',
          score: Math.round(percentage),
          completedAt: attempt.completed_at || attempt.completedAt,
          timeTaken: attempt.time_taken || attempt.timeSpent || 0
        });
      }
    });
    
    return Array.from(userScores.values())
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.timeTaken - b.timeTaken;
      })
      .slice(0, 10);
  }, [leaderboardData]);

  if (quizzesLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Leaderboards</h2>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-700/50 rounded-lg mb-6"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700/50 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Quiz Leaderboards</h2>
        <div className="flex items-center space-x-2 text-gray-400">
          <Users className="w-5 h-5" />
          <span>Top performers</span>
        </div>
      </div>

      {/* Quiz Selection Dropdown */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select a Quiz
        </label>
        <div className="relative">
          <select
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
          >
            <option value="">Choose a quiz to view leaderboard...</option>
            {quizzes?.map((quiz: any) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title} ({quiz.category})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Leaderboard Content */}
      {!selectedQuizId ? (
        <div className="text-center py-12">
          <div className="bg-gray-700/30 rounded-lg p-8">
            <Target className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Select a Quiz</h3>
            <p className="text-gray-400">Choose a quiz from the dropdown above to view its leaderboard!</p>
          </div>
        </div>
      ) : leaderboardLoading ? (
        <div className="space-y-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-600 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-600 rounded w-1/4"></div>
            </div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                  <div className="h-4 bg-gray-600 rounded w-32"></div>
                </div>
                <div className="h-6 bg-gray-600 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : processedLeaderboard.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-700/30 rounded-lg p-8">
            <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Results Yet</h3>
            <p className="text-gray-400">
              No one has completed "{selectedQuiz?.title}" yet. Be the first to take it!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quiz Info Header */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h3 className="text-xl font-semibold text-white mb-1">{selectedQuiz?.title}</h3>
            <p className="text-gray-400 text-sm">
              {selectedQuiz?.category} • {processedLeaderboard.length} participants
            </p>
          </div>

          {/* Podium for Top 3 */}
          {processedLeaderboard.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-gray-400/20 to-gray-600/20 border border-gray-400/30 rounded-lg p-4 text-center"
              >
                <Trophy className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <div className="text-2xl font-bold text-gray-300 mb-1">2nd</div>
                <div className="text-white font-semibold">{processedLeaderboard[1]?.username}</div>
                <div className="text-2xl font-bold text-gray-300 mt-2">{processedLeaderboard[1]?.score}%</div>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4 text-center transform scale-105"
              >
                <Crown className="w-10 h-10 mx-auto text-yellow-400 mb-2" />
                <div className="text-3xl font-bold text-yellow-400 mb-1">1st</div>
                <div className="text-white font-semibold text-lg">{processedLeaderboard[0]?.username}</div>
                <div className="text-3xl font-bold text-yellow-400 mt-2">{processedLeaderboard[0]?.score}%</div>
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-orange-400/20 to-red-500/20 border border-orange-400/30 rounded-lg p-4 text-center"
              >
                <Medal className="w-8 h-8 mx-auto text-orange-400 mb-2" />
                <div className="text-2xl font-bold text-orange-400 mb-1">3rd</div>
                <div className="text-white font-semibold">{processedLeaderboard[2]?.username}</div>
                <div className="text-2xl font-bold text-orange-400 mt-2">{processedLeaderboard[2]?.score}%</div>
              </motion.div>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="bg-gray-700/30 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-600/50 border-b border-gray-600/50">
              <h4 className="text-lg font-semibold text-white">Full Rankings</h4>
            </div>
            <div className="divide-y divide-gray-600/50">
              {processedLeaderboard.map((user, index) => {
                const rank = index + 1;
                const RankIcon = getRankIcon(rank);
                
                return (
                  <motion.div
                    key={user.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`px-6 py-4 flex items-center justify-between ${getRankBackground(rank)} border-l-4`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <RankIcon className={`w-6 h-6 ${getRankColor(rank)}`} />
                        <span className={`text-xl font-bold ${getRankColor(rank)} min-w-[2rem]`}>
                          #{rank}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-semibold text-lg">{user.username}</div>
                        {user.timeTaken > 0 && (
                          <div className="text-gray-400 text-sm">
                            Completed in {user.timeTaken} minutes
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getRankColor(rank)}`}>
                        {user.score}%
                      </div>
                      <div className="text-gray-400 text-sm">
                        {new Date(user.completedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
