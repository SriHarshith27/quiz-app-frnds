import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

/**
 * Reset all legacy users' passwords to a default password using bcrypt
 */
export const resetLegacyUsersToDefault = async (defaultPassword: string = 'pass123') => {
  try {
    console.log('Starting bulk password reset for legacy users...');
    
    // Get all users with passwords (legacy users)
    const { data: legacyUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, email, username, password')
      .not('password', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!legacyUsers || legacyUsers.length === 0) {
      return { 
        success: true, 
        message: 'No legacy users found to reset.',
        updatedCount: 0 
      };
    }

    console.log(`Found ${legacyUsers.length} legacy users to reset`);

    // Generate bcrypt hash for the default password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
    
    console.log('Generated new password hash');

    // Update all legacy users with the new password
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .not('password', 'is', null);

    if (updateError) {
      throw updateError;
    }

    console.log(`Successfully reset passwords for ${legacyUsers.length} users`);

    return {
      success: true,
      message: `Successfully reset passwords for ${legacyUsers.length} legacy users to "${defaultPassword}".`,
      updatedCount: legacyUsers.length,
      users: legacyUsers.map(u => ({ id: u.id, email: u.email, username: u.username }))
    };

  } catch (error) {
    console.error('Error resetting legacy user passwords:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset legacy user passwords',
      updatedCount: 0
    };
  }
};

/**
 * Reset a single user's password to default
 */
export const resetSingleUserPassword = async (userId: string, newPassword: string = 'pass123') => {
  try {
    console.log(`Resetting password for user ${userId}...`);
    
    // Generate bcrypt hash for the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the specific user's password
    const { error } = await supabase
      .from('users')
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    console.log(`Successfully reset password for user ${userId}`);
    return { success: true, message: 'Password reset successfully' };

  } catch (error) {
    console.error('Error resetting user password:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset password'
    };
  }
};

/**
 * Get count of legacy users (users with password field)
 */
export const getLegacyUserCount = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .not('password', 'is', null);

    if (error) throw error;

    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error('Error getting legacy user count:', error);
    return { success: false, count: 0 };
  }
};

/**
 * Clear all legacy passwords (remove password field)
 */
export const clearAllLegacyPasswords = async () => {
  try {
    console.log('Clearing all legacy passwords...');
    
    const { error } = await supabase
      .from('users')
      .update({ 
        password: null,
        updated_at: new Date().toISOString()
      })
      .not('password', 'is', null);

    if (error) {
      throw error;
    }

    console.log('Successfully cleared all legacy passwords');
    return { success: true, message: 'All legacy passwords cleared' };

  } catch (error) {
    console.error('Error clearing legacy passwords:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to clear legacy passwords'
    };
  }
};
