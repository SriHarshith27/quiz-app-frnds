// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with debug disabled
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // This will stop the GoTrueClient messages from spamming your console
    debug: false,
  }
});

// Utility function to get the correct redirect URL
export const getResetPasswordUrl = () => {
  if (typeof window === 'undefined') {
    return 'https://quiz-app-frnds.vercel.app/reset-password';
  }
  
  const isDevelopment = window.location.hostname === 'localhost';
  return isDevelopment 
    ? `${window.location.origin}/reset-password`
    : 'https://quiz-app-frnds.vercel.app/reset-password';
};