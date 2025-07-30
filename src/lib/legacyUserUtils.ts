import { supabase } from './supabase';

export interface LegacyUser {
  id: string;
  email: string;
  username: string;
  password?: string;
}

/**
 * Check if a user exists as a legacy user (in users table but not in Supabase Auth)
 */
export const checkLegacyUser = async (email: string): Promise<LegacyUser | null> => {
  try {
    const { data: legacyUser, error } = await supabase
      .from('users')
      .select('id, email, username, password')
      .eq('email', email)
      .single();

    if (error || !legacyUser) {
      return null;
    }

    // Check if they already exist in Supabase Auth
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const existsInAuth = authUsers.users?.some(user => user.email === email);

    // Return legacy user only if they don't exist in auth and have a password field
    return (!existsInAuth && legacyUser.password) ? legacyUser : null;
  } catch (error) {
    console.error('Error checking legacy user:', error);
    return null;
  }
};

/**
 * Migrate a legacy user to Supabase Auth
 */
export const migrateLegacyUser = async (legacyUser: LegacyUser): Promise<boolean> => {
  try {
    console.log('Migrating legacy user to Supabase Auth:', legacyUser.email);

    // Generate a temporary password for the auth account
    const tempPassword = Math.random().toString(36).slice(-12) + 'Temp1!';
    
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: legacyUser.email,
      password: tempPassword,
      options: {
        data: {
          username: legacyUser.username,
          migrated_legacy_user: true,
          original_user_id: legacyUser.id
        }
      }
    });

    if (signUpError && !signUpError.message.includes('already registered')) {
      throw signUpError;
    }

    console.log('Legacy user successfully migrated to Supabase Auth');
    return true;
  } catch (error) {
    console.error('Failed to migrate legacy user:', error);
    return false;
  }
};

/**
 * Clean up legacy password after successful migration
 */
export const cleanupLegacyPassword = async (email: string): Promise<void> => {
  try {
    await supabase
      .from('users')
      .update({ 
        password: null,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);
    
    console.log('Legacy password cleaned up for:', email);
  } catch (error) {
    console.warn('Failed to cleanup legacy password:', error);
  }
};

/**
 * Get statistics about legacy users
 */
export const getLegacyUserStats = async () => {
  try {
    // Try to query for users with passwords
    const { data: usersWithPasswords, error } = await supabase
      .from('users')
      .select('id, email, username, created_at, password')
      .not('password', 'is', null);

    if (error) {
      // If password column doesn't exist, return explanation
      if (error.message.includes('column "password" does not exist')) {
        console.log('Password column does not exist - no legacy users found');
        return {
          total: 0,
          users: [],
          message: 'No password column found. All users are using Supabase Auth.'
        };
      }
      throw error;
    }

    return {
      total: usersWithPasswords?.length || 0,
      users: usersWithPasswords || [],
      message: usersWithPasswords?.length ? 
        `Found ${usersWithPasswords.length} legacy users with stored passwords` :
        'No legacy users found with stored passwords'
    };
  } catch (error) {
    console.error('Error getting legacy user stats:', error);
    return { 
      total: 0, 
      users: [],
      message: 'Error checking for legacy users. Check console for details.'
    };
  }
};
