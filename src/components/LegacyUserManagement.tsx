import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Key, Mail, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getLegacyUserStats, LegacyUser } from '../lib/legacyUserUtils';
import { resetLegacyUsersToDefault, resetSingleUserPassword } from '../lib/passwordResetUtils';
import { AppleLoading } from './AppleLoading';

export const LegacyUserManagement: React.FC = () => {
  const [legacyUsers, setLegacyUsers] = useState<LegacyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetStatus, setResetStatus] = useState<{ [key: string]: 'idle' | 'resetting' | 'success' | 'error' }>({});
  const [stats, setStats] = useState<{ total: number; users: any[]; message?: string }>({ total: 0, users: [] });
  const [bulkResetLoading, setBulkResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('pass123');

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

  const handleResetUserPassword = async (user: LegacyUser) => {
    setResetStatus(prev => ({ ...prev, [user.id]: 'resetting' }));
    
    try {
      const result = await resetSingleUserPassword(user.id, newPassword);
      setResetStatus(prev => ({ 
        ...prev, 
        [user.id]: result.success ? 'success' : 'error' 
      }));
      
      if (result.success) {
        // Show success message
        console.log(`Password reset for ${user.email}: ${newPassword}`);
      }
    } catch (error) {
      console.error('Password reset failed:', error);
      setResetStatus(prev => ({ ...prev, [user.id]: 'error' }));
    }
  };

  const handleResetAllPasswords = async () => {
    setBulkResetLoading(true);
    
    try {
      const result = await resetLegacyUsersToDefault(newPassword);
      
      if (result.success) {
        // Mark all users as success
        const newStatuses: { [key: string]: 'success' } = {};
        legacyUsers.forEach(user => {
          newStatuses[user.id] = 'success';
        });
        setResetStatus(newStatuses);
        
        alert(`✅ Successfully reset passwords for ${result.updatedCount} users to "${newPassword}"`);
      } else {
        alert(`❌ Failed to reset passwords: ${result.message}`);
      }
    } catch (error) {
      console.error('Bulk password reset failed:', error);
      alert('❌ Failed to reset passwords. Please try again.');
    } finally {
      setBulkResetLoading(false);
    }
  };

  const getResetStatusIcon = (userId: string) => {
    const status = resetStatus[userId] || 'idle';
    
    switch (status) {
      case 'resetting':
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
            Legacy User Password Reset
          </h1>
          <p className="text-gray-400">
            Reset passwords for legacy users who need their passwords updated to the default: "{newPassword}"
          </p>
        </motion.div>

        {/* Password Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Key className="w-5 h-5 mr-2 text-blue-500" />
            Default Password Setting
          </h2>
          <div className="flex items-center space-x-4">
            <label className="text-gray-300 font-medium">New Password:</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter default password"
            />
            <span className="text-gray-400 text-sm">This password will be set for all legacy users</span>
          </div>
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
                <h3 className="text-lg font-semibold text-gray-300">Passwords Reset</h3>
                <p className="text-3xl font-bold text-green-500">
                  {Object.values(resetStatus).filter(s => s === 'success').length}
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
                <h3 className="text-lg font-semibold text-gray-300">Pending Reset</h3>
                <p className="text-3xl font-bold text-yellow-500">
                  {legacyUsers.length - Object.values(resetStatus).filter(s => s === 'success').length}
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
                  onClick={handleResetAllPasswords}
                  disabled={bulkResetLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg transition-colors flex items-center space-x-2"
                >
                  {bulkResetLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  <span>{bulkResetLoading ? 'Resetting...' : `Reset All to "${newPassword}"`}</span>
                </button>
              </div>
            )}
          </div>

          {legacyUsers.length === 0 ? (
            <div className="p-12 text-center">
              {stats.message ? (
                <>
                  <AlertCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No Legacy Users Found</h3>
                  <p className="text-gray-400 mb-6">
                    {stats.message}
                  </p>
                  <div className="bg-gray-700 p-4 rounded-lg text-left">
                    <h4 className="text-white font-semibold mb-2">What this means:</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• All users are using Supabase Auth (modern authentication)</li>
                      <li>• No password migration is needed</li>
                      <li>• Users can use the "Forgot Password" feature normally</li>
                      <li>• Password reset emails should work for all users</li>
                    </ul>
                  </div>
                  <div className="mt-6">
                    <h4 className="text-white font-semibold mb-2">Need to add legacy passwords?</h4>
                    <p className="text-gray-400 text-sm mb-4">
                      If you have users who need legacy password support, you can add a password column to your users table.
                    </p>
                    <div className="bg-gray-800 p-3 rounded border text-xs text-gray-300 font-mono text-left">
                      ALTER TABLE users ADD COLUMN password TEXT;
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">All Passwords Reset!</h3>
                  <p className="text-gray-400">
                    All legacy users have had their passwords reset to the default password.
                  </p>
                </>
              )}
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
                          {getResetStatusIcon(user.id)}
                          <span className="text-sm text-gray-300">
                            {resetStatus[user.id] === 'success' ? 'Password Reset' :
                             resetStatus[user.id] === 'resetting' ? 'Resetting...' :
                             resetStatus[user.id] === 'error' ? 'Failed' : 'Pending'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {resetStatus[user.id] === 'success' ? (
                          <span className="text-green-500">✓ Password: {newPassword}</span>
                        ) : (
                          <button
                            onClick={() => handleResetUserPassword(user)}
                            disabled={resetStatus[user.id] === 'resetting'}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-xs transition-colors"
                          >
                            {resetStatus[user.id] === 'resetting' ? 'Resetting...' : `Reset to "${newPassword}"`}
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
