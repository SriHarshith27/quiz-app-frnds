import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
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

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Get user profile from database
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUser(profile);
        }
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        // Get user profile from database
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUser(profile);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login with:', { email, passwordLength: password.length });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        
        // If credentials are invalid, check if this is a legacy user
        if (error.message.includes('Invalid login credentials')) {
          console.log('Checking for legacy user...');
          const legacyUser = await handleLegacyUserLogin(email, password);
          if (legacyUser) {
            return; // Login successful with legacy user migration
          }
          throw new Error('Invalid email or password. If you registered before our recent update, please use the "Reset Password" option to create a new password.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in.');
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a moment and try again.');
        }
        
        throw error;
      }

      console.log('Auth successful, fetching profile for user:', data.user?.id);

      if (data.user) {
        // Get user profile from database
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          throw profileError;
        }

        if (profile) {
          console.log('Profile fetched successfully:', profile.username);
          setUser(profile);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Handle legacy users who still have bcrypt passwords
  const handleLegacyUserLogin = async (email: string, password: string) => {
    try {
      // Check if user exists in our users table with a password field
      const { data: legacyUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !legacyUser || !legacyUser.password) {
        return null; // Not a legacy user
      }

      console.log('Found legacy user, attempting bcrypt verification...');
      
      // Import bcrypt dynamically for legacy support
      const bcrypt = await import('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, legacyUser.password);
      
      if (!isValidPassword) {
        return null; // Wrong password
      }

      console.log('Legacy password verified, migrating user to Supabase auth...');
      
      // Create the user in Supabase auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: legacyUser.email,
        password: password, // Use the same password
        options: {
          data: {
            username: legacyUser.username,
          },
        },
      });

      if (signUpError) {
        console.error('Failed to migrate user:', signUpError);
        return null;
      }

      // Update the user record to remove the old password and link to auth user
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          id: authData.user!.id,
          password: null // Remove old bcrypt password
        })
        .eq('email', email);

      if (updateError) {
        console.error('Failed to update user record:', updateError);
      }

      console.log('User migrated successfully!');
      setUser({ ...legacyUser, id: authData.user!.id, password: undefined });
      
      return legacyUser;
    } catch (error) {
      console.error('Legacy user migration error:', error);
      return null;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      console.log('Attempting registration with:', { username, email, passwordLength: password.length });
      
      // First, sign up with Supabase auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
        },
      });

      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }

      console.log('Supabase signup successful:', data.user?.id);

      if (data.user) {
        // Create user profile in the users table
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            username,
            email,
            role: 'user'
          }])
          .select()
          .single();

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw profileError;
        }

        console.log('Profile created successfully:', profile?.username);

        if (profile) {
          setUser(profile);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Sending password reset email to:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      console.log('Password reset email sent successfully');
      return { success: true, message: 'Password reset email sent! Check your inbox.' };
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        // Even if there's an error, we should clear the local state
      }
      
      setUser(null);
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear user state even on error
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, register, resetPassword, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};