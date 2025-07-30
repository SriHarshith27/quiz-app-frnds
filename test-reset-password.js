// Test script to verify reset password URL configuration
// Run this in browser console after loading the app

const testResetPasswordUrl = () => {
  console.log('🔍 Testing Reset Password URL Configuration');
  console.log('Current hostname:', window.location.hostname);
  console.log('Current origin:', window.location.origin);
  
  const isDevelopment = window.location.hostname === 'localhost';
  const expectedUrl = isDevelopment 
    ? `${window.location.origin}/reset-password`
    : 'https://quiz-app-frnds.vercel.app/reset-password';
    
  console.log('Expected redirect URL:', expectedUrl);
  console.log('Environment:', isDevelopment ? 'Development' : 'Production');
  
  return expectedUrl;
};

// Run the test
testResetPasswordUrl();

// Test email format
const testEmail = 'test@example.com';
console.log('📧 Test email format:', testEmail);
console.log('✅ Ready to test password reset functionality!');
