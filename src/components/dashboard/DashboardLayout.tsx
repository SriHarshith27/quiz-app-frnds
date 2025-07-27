import React from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, Trophy, Play, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: 'recent' | 'performance' | 'leaderboard' | 'browse';
  onTabChange: (tab: 'recent' | 'performance' | 'leaderboard' | 'browse') => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
}) => {
  const { user } = useAuth();

  const tabs = [
    {
      id: 'recent' as const,
      label: 'Recent Attempts',
      icon: Clock,
      description: 'Your latest quiz attempts'
    },
    {
      id: 'browse' as const,
      label: 'Browse Quizzes',
      icon: Play,
      description: 'Find and take new quizzes'
    },
    {
      id: 'performance' as const,
      label: 'Performance Analysis',
      icon: TrendingUp,
      description: 'Analyze your strengths and weaknesses'
    },
    {
      id: 'leaderboard' as const,
      label: 'Leaderboards',
      icon: Trophy,
      description: 'See how you rank against others'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user?.username}!</h1>
              <p className="text-gray-300">Track your progress and improve your knowledge</p>
            </div>
          </div>

          {/* Sub-Navigation */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-2">
            <div className="flex space-x-2 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`
                      relative flex items-center space-x-3 px-6 py-3 rounded-lg transition-all duration-200 whitespace-nowrap
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-semibold">{tab.label}</div>
                      <div className="text-xs opacity-75 hidden sm:block">{tab.description}</div>
                    </div>
                    
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg -z-10"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};
