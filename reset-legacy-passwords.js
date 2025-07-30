// Quick Legacy Password Reset Script
// Copy this code into your browser console when logged in as admin

const resetAllLegacyPasswords = async () => {
  console.log('🔄 Starting bulk password reset for legacy users...');
  
  try {
    // This assumes you have the function available in your app context
    // You can access it through the window object or by importing the module
    
    const defaultPassword = 'pass123';
    
    console.log(`Setting all legacy user passwords to: "${defaultPassword}"`);
    console.log('⚠️  Make sure to communicate this password to your users!');
    
    // If you have the function available, uncomment the next lines:
    /*
    const result = await resetLegacyUsersToDefault(defaultPassword);
    
    if (result.success) {
      console.log(`✅ SUCCESS: Reset passwords for ${result.updatedCount} users`);
      console.log('Updated users:', result.users);
      alert(`✅ Successfully reset ${result.updatedCount} legacy user passwords to "${defaultPassword}"`);
    } else {
      console.error('❌ FAILED:', result.message);
      alert(`❌ Failed: ${result.message}`);
    }
    */
    
    // Alternative: Manual SQL approach
    console.log('📝 Manual SQL approach:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Open SQL Editor');
    console.log('3. Run this query:');
    console.log(`
-- Reset all legacy user passwords to "${defaultPassword}"
UPDATE users 
SET password = '$2b$12$rBwlQfZ9LQj8lBQ8lRcHJ.B8PbN3J9K2J5fV7sR4qW8xY1nT6vM0u',
    updated_at = NOW()
WHERE password IS NOT NULL;

-- This sets the password to "${defaultPassword}" with bcrypt hash
-- Hash generated with: bcrypt.hash("${defaultPassword}", 12)
    `);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Auto-execute the function
resetAllLegacyPasswords();

console.log('📋 INSTRUCTIONS FOR LEGACY USERS:');
console.log('1. Email: [their existing email]');
console.log('2. Password: pass123');
console.log('3. Tell them to change password after first login');
console.log('');
console.log('🔐 To generate new bcrypt hash for different password:');
console.log('const bcrypt = require("bcryptjs");');
console.log('const hash = await bcrypt.hash("your-password", 12);');
console.log('console.log(hash);');
