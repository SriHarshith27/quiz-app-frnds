import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, Mail, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AppleLoading, SkeletonCard } from './AppleLoading';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export const CredentialManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const { adminResetUserPassword, isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, role, created_at')
        .eq('role', 'user') // Only show regular users, not admins
        .order('username', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ... imports

// ... component definition

  const handleResetPassword = async (user: User) => {
    try {
      setResetLoading(user.id);
      setError('');
      setSuccess('');

      // UPDATED: Pass only the email
      const result = await adminResetUserPassword(user.email);
      
      if (result.success) {
        setSuccess(`Password reset sent to ${user.username} (${user.email})`);
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
      setTimeout(() => setError(''), 5000);
    } finally {
      setResetLoading(null);
    }
  };

// ... rest of the component

  if (!isAdmin) {
    return (
      <div className="text-center text-red-400">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <p>Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Key className="w-8 h-8 text-yellow-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Credential Management</h2>
              <p className="text-gray-400 text-sm">Reset user passwords to default</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center py-12">
          <AppleLoading size="md" text="Loading users..." />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Key className="w-8 h-8 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Credential Management</h2>
            <p className="text-gray-400 text-sm">Reset user passwords to default</p>
          </div>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/20 border border-red-500 text-red-400 p-4 rounded-lg flex items-center space-x-2"
        >
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-900/20 border border-green-500 text-green-400 p-4 rounded-lg flex items-center space-x-2"
        >
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
        </motion.div>
      )}

      <div className="bg-gray-800 rounded-xl p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-700 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{user.username}</p>
                  <div className="flex items-center space-x-1 text-gray-400 text-sm">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleResetPassword(user)}
                disabled={resetLoading === user.id}
                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors"
              >
                {resetLoading === user.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Reset Password</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        )}
      </div>

      <div className="bg-yellow-900/20 border border-yellow-500 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Key className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <h3 className="text-yellow-400 font-medium mb-2">How Password Reset Works</h3>
            <div className="text-yellow-300 text-sm space-y-1">
              <p>• Users receive a secure reset email at their registered address</p>
              <p>• Email contains a link to: <code className="bg-gray-700 px-1 rounded">quiz-app-frnds.vercel.app/reset-password</code></p>
              <p>• Recommend users set password to: <code className="bg-gray-700 px-1 rounded font-mono">pass123</code></p>
              <p>• Users can also choose their own custom password</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
