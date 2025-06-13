// Debug script for jackenhaiti@gmail.com authentication issues
const { createClient } = require('@supabase/supabase-js');
const { userAppData } = require('./src/utils/userAppData.js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugUserAuth() {
  console.log('🔍 DEBUGGING AUTHENTICATION FOR jackenhaiti@gmail.com');
  console.log('='.repeat(60));
  
  console.log('\n1. Testing Supabase Connection...');
  try {
    const { data: connectionTest } = await supabase.from('profiles').select('count').limit(1);
    console.log('✅ Supabase connection successful');
  } catch (error) {
    console.log('❌ Supabase connection failed:', error.message);
  }
  
  console.log('\n2. Attempting to sign in jackenhaiti@gmail.com...');
  try {
    // Try to sign in with a common password (this will likely fail but shows the error)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'jackenhaiti@gmail.com',
      password: 'testpassword123' // This is just for testing
    });
    
    if (authError) {
      console.log('❌ Sign in failed:', authError.message);
      console.log('   This is expected if password is incorrect');
    } else {
      console.log('✅ Sign in successful');
      console.log('   User ID:', authData.user.id);
    }
  } catch (error) {
    console.log('❌ Sign in error:', error.message);
  }
  
  console.log('\n3. Checking if user exists in auth system...');
  try {
    // Try to send a password reset to see if user exists
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      'jackenhaiti@gmail.com'
    );
    
    if (resetError) {
      console.log('❌ Password reset failed:', resetError.message);
    } else {
      console.log('✅ Password reset email sent - user exists in auth system');
    }
  } catch (error) {
    console.log('❌ Password reset error:', error.message);
  }
  
  console.log('\n4. Testing userAppData function with mock user ID...');
  try {
    // Test with a fake user ID to see what errors we get
    const mockUserId = '11111111-2222-3333-4444-555555555555';
    console.log('   Testing with mock user ID:', mockUserId);
    
    const userData = await userAppData(mockUserId);
    console.log('✅ userAppData completed');
    console.log('   Profile exists:', !!userData.profile);
    console.log('   Settings exists:', !!userData.settings);
    console.log('   Tasks count:', userData.tasks?.length || 0);
    console.log('   Sessions count:', userData.sessions?.length || 0);
  } catch (error) {
    console.log('❌ userAppData failed:', error.message);
    console.log('   Stack trace:', error.stack?.split('\n')[1] || 'No stack trace');
  }
  
  console.log('\n5. Checking table accessibility...');
  const tables = ['profiles', 'tasks', 'focus_sessions', 'user_settings', 'onboarding_preferences'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Accessible (${data.length} sample records)`);
      }
    } catch (error) {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }
  
  console.log('\n6. Configuration Summary...');
  console.log('   Supabase URL:', supabaseUrl);
  console.log('   Anon Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...');
  console.log('   Service Key available:', !!process.env.SUPABASE_SERVICE_KEY && process.env.SUPABASE_SERVICE_KEY !== 'YOUR_ACTUAL_SERVICE_KEY_HERE');
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 RECOMMENDATIONS:');
  console.log('1. Get the actual SUPABASE_SERVICE_KEY from Supabase dashboard');
  console.log('2. Run migrations to fix database schema');
  console.log('3. Create proper user data for jackenhaiti@gmail.com');
  console.log('4. Test authentication flow after fixes');
}

debugUserAuth().catch(console.error);
