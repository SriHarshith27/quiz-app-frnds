import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Key, Mail, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getLegacyUserStats, migrateLegacyUser, LegacyUser } from '../lib/legacyUserUtils';
import { AppleLoading } from './AppleLoading';

export const LegacyUserManagement: React.FC = () => {
  const [legacyUsers, setLegacyUsers] = useState<LegacyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<{ [key: string]: 'idle' | 'migrating' | 'success' | 'error' }>({});
  const [stats, setStats] = useState<{ total: number; users: any[] }>({ total: 0, users: [] });

  useEffect(() => {
    loadLegacyUsers();
  }, []);

  const loadLegacyUsers = async () => {
    try {
      setLoading(true);
      const result = await getLegacyUserStats();
      setStats(result);
      setLegacyUsers(result.users as LegacyUser[]);
    } catch (error) {
      console.error('Failed to load legacy users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateUser = async (user: LegacyUser) => {
    setMigrationStatus(prev => ({ ...prev, [user.id]: 'migrating' }));
    
    try {
      const success = await migrateLegacyUser(user);
      setMigrationStatus(prev => ({ 
        ...prev, 
        [user.id]: success ? 'success' : 'error' 
      }));
      
      if (success) {
        // Refresh the list to remove migrated user
        setTimeout(() => {
          loadLegacyUsers();
        }, 2000);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationStatus(prev => ({ ...prev, [user.id]: 'error' }));
    }
  };

  const handleMigrateAll = async () => {
    const usersToMigrate = legacyUsers.filter(user => 
      migrationStatus[user.id] !== 'success' && migrationStatus[user.id] !== 'migrating'
    );
    
    for (const user of usersToMigrate) {
      await handleMigrateUser(user);
      // Small delay between migrations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const getMigrationStatusIcon = (userId: string) => {
    const status = migrationStatus[userId] || 'idle';
    
    switch (status) {
      case 'migrating':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Key className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <AppleLoading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-4 flex items-center">
            <Users className="w-8 h-8 mr-3 text-blue-500" />
            Legacy User Management
          </h1>
          <p className="text-gray-400">
            Manage users who have old password formats and need migration to the new authentication system.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 p-6 rounded-xl border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-300">Total Legacy Users</h3>
                <p className="text-3xl font-bold text-blue-500">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 p-6 rounded-xl border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-300">Migrated</h3>
                <p className="text-3xl font-bold text-green-500">
                  {Object.values(migrationStatus).filter(s => s === 'success').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 p-6 rounded-xl border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-300">Pending</h3>
                <p className="text-3xl font-bold text-yellow-500">
                  {legacyUsers.length - Object.values(migrationStatus).filter(s => s === 'success').length}
                </p>
              </div>
              <Key className="w-8 h-8 text-yellow-500" />
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Legacy Users</h2>
            {legacyUsers.length > 0 && (
              <div className="flex space-x-3">
                <button
                  onClick={loadLegacyUsers}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handleMigrateAll}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Key className="w-4 h-4" />
                  <span>Migrate All</span>
                </button>
              </div>
            )}
          </div>

          {legacyUsers.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">All Users Migrated!</h3>
              <p className="text-gray-400">
                All legacy users have been successfully migrated to the new authentication system.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {legacyUsers.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">
                              {user.username?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{user.username || 'No Username'}</div>
                            <div className="text-sm text-gray-400">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-white">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getMigrationStatusIcon(user.id)}
                          <span className="text-sm text-gray-300">
                            {migrationStatus[user.id] === 'success' ? 'Migrated' :
                             migrationStatus[user.id] === 'migrating' ? 'Migrating...' :
                             migrationStatus[user.id] === 'error' ? 'Failed' : 'Pending'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {migrationStatus[user.id] === 'success' ? (
                          <span className="text-green-500">✓ Complete</span>
                        ) : (
                          <button
                            onClick={() => handleMigrateUser(user)}
                            disabled={migrationStatus[user.id] === 'migrating'}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-xs transition-colors"
                          >
                            {migrationStatus[user.id] === 'migrating' ? 'Migrating...' : 'Migrate'}
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
