// Debug script for testing authentication
// Run this in browser console to debug auth issues

console.log('=== Authentication Debug Script ===');

// Check if Supabase is accessible
console.log('1. Supabase client:', window.supabase || 'Not found');

// Check current user
if (window.supabase) {
  window.supabase.auth.getUser().then(({ data, error }) => {
    console.log('2. Current user:', data.user);
    console.log('2. User error:', error);
  });

  // Check users table
  window.supabase.from('users').select('*').then(({ data, error }) => {
    console.log('3. Users in database:', data);
    console.log('3. Users error:', error);
  });

  // Check auth users (admin only)
  console.log('4. Try logging in with test credentials');
  console.log('   - Make sure email confirmation is disabled in Supabase dashboard');
  console.log('   - Or check your email for confirmation link');
}

// Instructions
console.log(`
=== Troubleshooting Steps ===
1. Go to your Supabase Dashboard > Authentication > Settings
2. Disable "Enable email confirmations" for testing
3. Make sure "Enable email provider" is ON
4. Try registering a new user first, then login
5. Check browser network tab for detailed error responses
6. Check Supabase logs in the dashboard
`);

export {};
