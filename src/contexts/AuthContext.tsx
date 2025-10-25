// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User } from '../types';
import { supabase, getResetPasswordUrl } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  adminResetUserPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const getUserProfile = async (authUser: any): Promise<User | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (error) throw error;
      return profile;

    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };

  const handleError = useCallback((err: Error) => {
    console.error('Auth error:', err);
    setError(err);
  }, []);

  const updateUserState = useCallback(async (authUser: any) => {
    if (!mountedRef.current) return;

    try {
      if (authUser) {
        const profile = await getUserProfile(authUser);
        if (mountedRef.current) {
          setUser(profile);
        }
      } else {
        if (mountedRef.current) {
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Error updating user state:', error);
      if (mountedRef.current) {
        handleError(error as Error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setInitialized(true);
      }
    }
  }, [handleError]);

  useEffect(() => {
    if (initialized) return;

    let isCancelled = false;
    let authSubscription: any = null;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mountedRef.current && !isCancelled) {
            handleError(error);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (isCancelled || !mountedRef.current) return;
            console.log('Auth state change:', event, !!session);
            setError(null);
            await updateUserState(session?.user || null);
          }
        );

        authSubscription = subscription;

        if (!isCancelled && mountedRef.current) {
          await updateUserState(session?.user || null);
        }

      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mountedRef.current && !isCancelled) {
          handleError(error as Error);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initAuth();

    return () => {
      isCancelled = true;
      if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
      }
    };
  }, [initialized, updateUserState, handleError]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };
  
  const register = async (username: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    if (error) throw new Error(error.message);
    alert('Registration successful! Please check your email to confirm your account.');
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = getResetPasswordUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Password reset email sent.' };
  };
  
  const isAdmin = user?.role === 'admin';

  const adminResetUserPassword = async (email: string) => {
    if (!isAdmin) throw new Error("Unauthorized");
    const redirectUrl = getResetPasswordUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    if (error) throw error;
    return { success: true, message: `Password reset sent to ${email}` };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    resetPassword,
    adminResetUserPassword,
    logout,
    loading,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};