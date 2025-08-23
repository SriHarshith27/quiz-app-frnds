import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
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
  error: string | null;
  clearError: () => void;
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
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  // Refs to prevent race conditions and memory leaks
  const mountedRef = useRef(true);
  const authListenerRef = useRef<any>(null);
  const currentUserRef = useRef<User | null>(null);

  // Update refs when user changes
  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (authListenerRef.current) {
        authListenerRef.current.subscription?.unsubscribe();
        authListenerRef.current = null;
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: Error | string) => {
    const message = typeof error === 'string' ? error : error.message;
    console.error('Auth Error:', message);
    if (mountedRef.current) {
      setError(message);
    }
  }, []);

  const ensureUserProfile = useCallback(async (authUser: any): Promise<User | null> => {
    if (!mountedRef.current) return null;

    const maxRetries = 5;
    const retryDelay = 1000; // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Try to get existing profile (database trigger should have created it)
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        // If profile exists, return it
        if (profile && !error) {
          return profile;
        }

        // If error is not "not found", log it and return null
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
          return null;
        }

        // Profile doesn't exist yet, wait for database trigger to create it
        if (attempt < maxRetries - 1) {
          console.log(`Profile not found for user ${authUser.id}, waiting for database trigger (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        // If we've exhausted all retries, log an error
        console.error(`Profile creation failed for user ${authUser.id} after ${maxRetries} attempts. Database trigger may have failed.`);
        return null;

      } catch (error) {
        console.error('Error in ensureUserProfile:', error);
        return null;
      }
    }

    return null;
  }, []);

  const updateUserState = useCallback(async (authUser: any) => {
    if (!mountedRef.current) return;

    try {
      if (authUser) {
        const profile = await ensureUserProfile(authUser);
        if (mountedRef.current && profile) {
          setUser(profile);
        } else if (mountedRef.current) {
          setUser(null);
          handleError('Failed to load user profile');
        }
      } else {
        if (mountedRef.current) {
          setUser(null);
        }
      }
    } catch (error) {
      if (mountedRef.current) {
        handleError(error as Error);
        setUser(null);
      }
    } finally {
      if (mountedRef.current && !initialized) {
        setLoading(false);
        setInitialized(true);
      }
    }
  }, [ensureUserProfile, handleError, initialized]);

  // Initialize auth state and set up listener
  useEffect(() => {
    if (initialized) return;

    let isCancelled = false;

    const initAuth = async () => {
      try {
        // Get initial session
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

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (isCancelled || !mountedRef.current) return;
            
            console.log('Auth state change:', event, !!session);
            
            // Clear any previous errors on state change
            setError(null);
            
            await updateUserState(session?.user || null);
          }
        );

        authListenerRef.current = { subscription };

        // Process initial session
        if (!isCancelled) {
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
    };
  }, [initialized, updateUserState, handleError]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    if (!mountedRef.current) return;
    
    setError(null);
    
    try {
      // Try Supabase auth
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        throw new Error(error.message);
      }

      // User state will be updated by the auth listener
      // No need to manually set user here to avoid race conditions
      
    } catch (error) {
      handleError(error as Error);
      throw error;
    }
  }, [handleError]);

  const register = useCallback(async (username: string, email: string, password: string): Promise<void> => {
    if (!mountedRef.current) return;
    
    setError(null);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { username } 
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }

      // User state will be updated by the auth listener
      // No need to manually set user here to avoid race conditions
      
    } catch (error) {
      handleError(error as Error);
      throw error;
    }
  }, [handleError]);

  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean; message: string }> => {
    setError(null);
    
    try {
      const redirectUrl = getResetPasswordUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(email, { 
        redirectTo: redirectUrl 
      });
      
      if (error) {
        const errorMessage = error.message;
        handleError(errorMessage);
        return { success: false, message: errorMessage };
      }
      
      return { 
        success: true, 
        message: `Password reset email sent to ${email}.` 
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      handleError(errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [handleError]);
  
  const adminResetUserPassword = useCallback(async (email: string): Promise<{ success: boolean; message: string }> => {
    if (currentUserRef.current?.role !== 'admin') {
      const errorMessage = 'Permission denied. Admin access required.';
      handleError(errorMessage);
      throw new Error(errorMessage);
    }
    
    setError(null);
    
    try {
      const redirectUrl = getResetPasswordUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(email, { 
        redirectTo: redirectUrl 
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return { 
        success: true, 
        message: `Password reset email sent to ${email}.` 
      };
    } catch (error) {
      handleError(error as Error);
      throw error;
    }
  }, [handleError]);

  const logout = useCallback(async (): Promise<void> => {
    setError(null);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        // Don't throw on logout errors, just log them
      }
      
      // User state will be updated by the auth listener
      // No need to manually set user here to avoid race conditions
      
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw on logout errors, just log them
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  const contextValue: AuthContextType = {
    user,
    login,
    register,
    resetPassword,
    adminResetUserPassword,
    logout,
    loading: loading && !initialized,
    isAdmin,
    error,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};