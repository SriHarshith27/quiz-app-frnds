import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Key, Mail, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export const UserManagement: React.FC = () => {
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
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      setResetLoading(user.id);
      setError('');
      setSuccess('');

      const result = await adminResetUserPassword(user.id, user.email);
      
      if (result.success) {
        setSuccess(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      setError('');
      setSuccess('');

      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setSuccess(`User role updated to ${newRole}`);
      fetchUsers(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
    }
  };

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
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Users className="w-8 h-8 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">User Management</h2>
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

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-white font-medium">User</th>
                <th className="px-4 py-3 text-left text-white font-medium">Email</th>
                <th className="px-4 py-3 text-left text-white font-medium">Role</th>
                <th className="px-4 py-3 text-left text-white font-medium">Created</th>
                <th className="px-4 py-3 text-center text-white font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white font-medium">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'user')}
                      className="bg-gray-700 border border-gray-600 text-white px-2 py-1 rounded text-sm"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleResetPassword(user)}
                        disabled={resetLoading === user.id}
                        className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-3 py-1 rounded-md text-sm flex items-center space-x-1 transition-colors"
                      >
                        {resetLoading === user.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Key className="w-4 h-4" />
                            <span>Reset Pass</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No users found</p>
        </div>
      )}

      <div className="bg-blue-900/20 border border-blue-500 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-blue-400 font-medium mb-2">Password Reset Information</h3>
            <div className="text-blue-300 text-sm space-y-2">
              <p>
                When you reset a user's password, they will receive an email with a secure reset link.
              </p>
              <p>
                <strong>Recommended approach:</strong> Ask users to set their password to <code className="bg-gray-700 px-1 rounded">pass123</code> for simplicity, 
                but they can choose any password they prefer when following the reset link.
              </p>
              <p>
                The reset link will direct them to: <code className="bg-gray-700 px-1 rounded">https://quiz-app-frnds.vercel.app/reset-password</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
