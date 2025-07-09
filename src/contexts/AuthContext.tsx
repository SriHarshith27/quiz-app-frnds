import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Simple password hashing (use bcrypt in production)
const hashPassword = (password: string): string => {
  return btoa(password); // Base64 encoding - replace with proper hashing
};

const verifyPassword = (password: string, hash: string): boolean => {
  return btoa(password) === hash;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('quiz_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      // Set current user for RLS
      supabase.rpc('set_config', {
        setting_name: 'app.current_user',
        setting_value: userData.username
      });
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !userData) {
        throw new Error('Invalid email or password');
      }

      if (!verifyPassword(password, userData.password_hash)) {
        throw new Error('Invalid email or password');
      }

      setUser(userData);
      localStorage.setItem('quiz_user', JSON.stringify(userData));
      
      // Set current user for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_user',
        setting_value: userData.username
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .or(`username.eq.${username},email.eq.${email}`)
        .single();

      if (existingUser) {
        throw new Error('Username or email already exists');
      }

      const hashedPassword = hashPassword(password);

      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          username,
          email,
          password_hash: hashedPassword,
          role: 'user'
        }])
        .select()
        .single();

      if (error) throw error;

      setUser(newUser);
      localStorage.setItem('quiz_user', JSON.stringify(newUser));
      
      // Set current user for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_user',
        setting_value: newUser.username
      });
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('quiz_user');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};