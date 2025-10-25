import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, BarChart3, Award, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserAttempts } from '../../hooks/useQueries';

interface CategoryPerformance {
  category: string;
  averageScore: number;
  totalAttempts: number;
  bestScore: number;
  recentTrend: 'up' | 'down' | 'stable';
}

export const PerformanceAnalysis: React.FC = () => {
  const { user } = useAuth();
  const { data: userAttempts, isLoading, error } = useUserAttempts(user?.id || '');

  const performanceData = useMemo(() => {
    if (!userAttempts || userAttempts.length === 0) return null;

    const categoryMap = new Map<string, any[]>();
    
    userAttempts.forEach((attempt: any) => {
      const category = attempt.quizzes?.category || 'General';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(attempt);
    });

    const categoryPerformance: CategoryPerformance[] = [];
    
    categoryMap.forEach((attempts, category) => {
      const scores = attempts.map(a => a.score || 0);
      
      // Safety check for empty arrays
      if (scores.length === 0) return;
      
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const bestScore = Math.max(...scores, 0);
      
      let recentTrend: 'up' | 'down' | 'stable' = 'stable';
      if (attempts.length >= 6) {
        const sortedByDate = attempts.sort((a, b) => 
          new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        );
        const recentScores = sortedByDate.slice(0, 3).map(a => a.score || 0);
        const olderScores = sortedByDate.slice(3, 6).map(a => a.score || 0);
        
        // Safety check for division
        if (recentScores.length > 0 && olderScores.length > 0) {
          const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
          const olderAvg = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;
          
          if (recentAvg > olderAvg + 5) recentTrend = 'up';
          else if (recentAvg < olderAvg - 5) recentTrend = 'down';
        }
      }

      categoryPerformance.push({
        category,
        averageScore,
        totalAttempts: attempts.length,
        bestScore,
        recentTrend
      });
    });

    categoryPerformance.sort((a, b) => b.averageScore - a.averageScore);

    const strongAreas = categoryPerformance.filter(c => c.averageScore >= 75);
    const weakAreas = categoryPerformance.filter(c => c.averageScore < 50);
    const moderateAreas = categoryPerformance.filter(c => c.averageScore >= 50 && c.averageScore < 75);

    // Safety check for average calculation
    const overallAverage = categoryPerformance.length > 0
      ? categoryPerformance.reduce((sum, c) => sum + c.averageScore, 0) / categoryPerformance.length
      : 0;

    return {
      categoryPerformance,
      strongAreas,
      weakAreas,
      moderateAreas,
      overallAverage
    };
  }, [userAttempts]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Performance Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-600 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-600 rounded"></div>
                <div className="h-4 bg-gray-600 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Performance Analysis</h2>
        <p className="text-red-400">Error loading performance data. Please try again later.</p>
      </div>
    );
  }

  if (!performanceData || performanceData.categoryPerformance.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-6">Performance Analysis</h2>
        <div className="bg-gray-700/30 rounded-lg p-8">
          <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No performance data yet</h3>
          <p className="text-gray-400">Complete more quizzes to see your performance analysis!</p>
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Target;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const renderCategoryCard = (category: CategoryPerformance, index: number) => {
    const TrendIcon = getTrendIcon(category.recentTrend);
    
    return (
      <motion.div
        key={category.category}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="bg-gray-700/50 rounded-lg p-6"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{category.category}</h3>
            <p className="text-sm text-gray-400">{category.totalAttempts} attempts</p>
          </div>
          <div className="flex items-center space-x-2">
            <TrendIcon className={`w-5 h-5 ${getTrendColor(category.recentTrend)}`} />
            <span className="text-2xl font-bold text-white">{category.averageScore.toFixed(1)}%</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Best Score:</span>
            <span className="text-green-400 font-semibold">{category.bestScore}%</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${category.averageScore}%` }}
            ></div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Analysis</h2>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-400">
            {performanceData.overallAverage.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400">Overall Average</div>
        </div>
      </div>

      {/* Strong Areas */}
      {performanceData.strongAreas.length > 0 && (
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <Award className="w-6 h-6 text-green-400" />
            <h3 className="text-xl font-semibold text-green-400">Strong Areas (75%+)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {performanceData.strongAreas.map((category, index) => 
              renderCategoryCard(category, index)
            )}
          </div>
        </div>
      )}

      {/* Moderate Areas */}
      {performanceData.moderateAreas.length > 0 && (
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <Target className="w-6 h-6 text-yellow-400" />
            <h3 className="text-xl font-semibold text-yellow-400">Moderate Areas (50-75%)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {performanceData.moderateAreas.map((category, index) => 
              renderCategoryCard(category, index)
            )}
          </div>
        </div>
      )}

      {/* Weak Areas */}
      {performanceData.weakAreas.length > 0 && (
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h3 className="text-xl font-semibold text-red-400">Areas for Improvement (&lt;50%)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {performanceData.weakAreas.map((category, index) => 
              renderCategoryCard(category, index)
            )}
          </div>
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mt-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-400 mb-1">Recommendations</h4>
                <p className="text-sm text-gray-300">
                  Focus on practicing quizzes in these categories to improve your scores. 
                  Review the questions you got wrong and study the relevant topics.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
