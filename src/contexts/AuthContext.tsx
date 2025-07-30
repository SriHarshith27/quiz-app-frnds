import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { supabase, getResetPasswordUrl } from '../lib/supabase';
import { checkLegacyUser, migrateLegacyUser } from '../lib/legacyUserUtils';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  adminResetUserPassword: (userId: string, email: string) => Promise<{ success: boolean; message: string }>;
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

  // Helper function to ensure user profile exists
  const ensureUserProfile = async (authUser: any) => {
    try {
      // Add a small cache to avoid repeated calls for the same user
      const cachedProfile = sessionStorage.getItem(`profile_${authUser.id}`);
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          // Cache is valid for 5 minutes
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            console.log('Using cached profile:', parsed.profile.username);
            return parsed.profile;
          }
        } catch (e) {
          // Invalid cache, continue with API call
        }
      }

      // Try to get existing profile
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (profile) {
        console.log('Profile found:', profile.username);
        // Cache the profile
        sessionStorage.setItem(`profile_${authUser.id}`, JSON.stringify({
          profile,
          timestamp: Date.now()
        }));
        return profile;
      }

      // Create profile if it doesn't exist
      console.log('Creating missing profile for user:', authUser.id);
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert([{
          id: authUser.id,
          username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
          email: authUser.email!,
          role: 'user'
        }])
        .select()
        .single();

      if (createError) {
        // If duplicate key error (23505), try to fetch the existing profile again
        if (createError.code === '23505') {
          console.log('Profile already exists due to race condition, trying multiple fetch strategies...');
          
          // Try fetching by ID first
          const { data: existingById } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          if (existingById) {
            console.log('Found existing profile by ID after race condition:', existingById.username);
            // Cache the found profile
            sessionStorage.setItem(`profile_${authUser.id}`, JSON.stringify({
              profile: existingById,
              timestamp: Date.now()
            }));
            return existingById;
          }

          // If not found by ID, try by email
          const { data: existingByEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', authUser.email!)
            .maybeSingle();

          if (existingByEmail) {
            console.log('Found existing profile by email after race condition:', existingByEmail.username);
            // Cache the found profile
            sessionStorage.setItem(`profile_${authUser.id}`, JSON.stringify({
              profile: existingByEmail,
              timestamp: Date.now()
            }));
            return existingByEmail;
          }

          // If still not found, wait a moment and try one more time (database trigger might be slow)
          console.log('Profile not found immediately after creation conflict, waiting 500ms and trying again...');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: finalTry } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          if (finalTry) {
            console.log('Found profile on final attempt:', finalTry.username);
            // Cache the found profile
            sessionStorage.setItem(`profile_${authUser.id}`, JSON.stringify({
              profile: finalTry,
              timestamp: Date.now()
            }));
            return finalTry;
          }
        }
        
        console.error('Error creating profile:', createError);
        return null;
      }

      console.log('Profile created successfully:', newProfile?.username);
      
      // Cache the new profile
      if (newProfile) {
        sessionStorage.setItem(`profile_${authUser.id}`, JSON.stringify({
          profile: newProfile,
          timestamp: Date.now()
        }));
      }
      
      return newProfile;
    } catch (error) {
      console.error('Error in ensureUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const profile = await ensureUserProfile(session.user);
        if (profile) {
          setUser(profile);
        }
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      // Only process specific events to avoid unnecessary calls
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await ensureUserProfile(session.user);
        if (profile) {
          setUser(profile);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user && !user) {
        // Only fetch profile if we don't already have a user (edge case)
        const profile = await ensureUserProfile(session.user);
        if (profile) {
          setUser(profile);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login with:', { email, passwordLength: password.length });
      
      // First try direct bcrypt login (for users with password field)
      const legacyUser = await handleDirectBcryptLogin(email, password);
      if (legacyUser) {
        console.log('Direct bcrypt login successful');
        setUser(legacyUser);
        return;
      }
      
      // Fallback to Supabase Auth for users without password field
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in.');
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a moment and try again.');
        }
        
        throw error;
      }

      console.log('Auth successful, fetching profile for user:', data.user?.id);

      if (data.user) {
        const profile = await ensureUserProfile(data.user);
        if (profile) {
          setUser(profile);
        } else {
          throw new Error('Unable to access your account profile. Please try again or contact support.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Direct bcrypt login for users with password field
  const handleDirectBcryptLogin = async (email: string, password: string) => {
    try {
      // Check if user exists in our users table with a password field
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user || !user.password) {
        return null; // Not a bcrypt user
      }

      console.log('Found user with bcrypt password, verifying...');
      
      // Import bcrypt dynamically
      const bcrypt = await import('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return null; // Wrong password
      }

      console.log('Bcrypt password verified successfully');
      return user;
    } catch (error) {
      console.error('Direct bcrypt login error:', error);
      return null;
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
      
      // Check if user already exists in our users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('An account with this email already exists');
      }

      // Use Supabase's built-in authentication
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      });

      if (signUpError) {
        console.error('Supabase signUp error:', signUpError);
        if (signUpError.message.includes('already registered')) {
          throw new Error('An account with this email already exists');
        }
        throw new Error(signUpError.message || 'Failed to create account. Please try again.');
      }

      if (!authData.user) {
        throw new Error('Failed to create account. Please try again.');
      }

      console.log('Supabase auth user created:', authData.user.id);

      // The user profile should be automatically created by the database trigger
      // Let's ensure it exists
      const newProfile = await ensureUserProfile(authData.user);
      
      if (!newProfile) {
        throw new Error('Failed to create user profile. Please try again.');
      }

      console.log('User registered successfully:', newProfile.username);
      
      // Set user and log them in
      setUser(newProfile);
      
      return newProfile;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Sending password reset email to:', email);
      
      const redirectUrl = getResetPasswordUrl();
      console.log('Using redirect URL:', redirectUrl);

      // Check if this is a legacy user first
      const legacyUser = await checkLegacyUser(email);
      
      if (legacyUser) {
        console.log('Found legacy user, migrating to Supabase Auth...');
        
        const migrationSuccess = await migrateLegacyUser(legacyUser);
        
        if (!migrationSuccess) {
          return {
            success: false,
            message: 'Failed to migrate your legacy account. Please contact support.'
          };
        }
        
        // Small delay to ensure migration is complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Send password reset email (works for both regular and newly migrated users)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Supabase resetPasswordForEmail error:', error);
        
        // Provide user-friendly error messages
        if (error.message.includes('User not found')) {
          return {
            success: false,
            message: 'No account found with this email address. Please check your email or create a new account.'
          };
        }
        
        return {
          success: false,
          message: 'Failed to send password reset email. Please try again or contact support.'
        };
      }

      console.log('Password reset email sent successfully');
      
      const message = legacyUser 
        ? `Password reset email sent! We've migrated your legacy account to our new system. Check your inbox and follow the instructions to set your new password.`
        : `Password reset email sent! Check your inbox and follow the instructions to reset your password.`;
      
      return { 
        success: true, 
        message: `${message} The reset link will redirect you to: ${redirectUrl}` 
      };
      
    } catch (error) {
      console.error('Password reset error:', error);
      return { 
        success: false, 
        message: 'An unexpected error occurred. Please try again or contact support.' 
      };
    }
  };

  // Admin function to reset user password to default
  const adminResetUserPassword = async (userId: string, email: string) => {
    try {
      if (!isAdmin) {
        throw new Error('Only administrators can reset user passwords');
      }

      console.log('Admin resetting password for user:', email);

      // Use utility function to get correct redirect URL
      const redirectUrl = getResetPasswordUrl();

      // Send password reset email with admin context
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        console.error('Admin reset password error:', resetError);
        throw resetError;
      }

      // Also try to update user record to indicate password reset was initiated by admin
      try {
        await supabase
          .from('users')
          .update({ 
            updated_at: new Date().toISOString(),
            // Could add a flag here if needed
          })
          .eq('id', userId);
      } catch (updateError) {
        console.log('Note: Could not update user record:', updateError);
        // This is not critical, so we don't throw
      }

      console.log('Password reset email sent successfully for user:', email);
      return { 
        success: true, 
        message: `Password reset email sent to ${email}. The user will receive instructions to set their new password to 'pass123' or create a custom one.` 
      };
    } catch (error) {
      console.error('Admin password reset error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      setLoading(true);
      
      // Clear profile cache for current user
      if (user?.id) {
        sessionStorage.removeItem(`profile_${user.id}`);
      }
      
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
    <AuthContext.Provider value={{ user, login, register, resetPassword, adminResetUserPassword, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};