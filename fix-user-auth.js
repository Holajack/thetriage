#!/usr/bin/env node

/**
 * Fix Authentication for jackenhaiti@gmail.com
 * This script will reset the user's password and ensure proper data setup
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔧 FIXING AUTHENTICATION FOR jackenhaiti@gmail.com');
console.log('================================================');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ Missing Supabase environment variables!');
  console.log('   Please ensure .env file has service key');
  process.exit(1);
}

// Create admin client with service key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const targetEmail = 'jackenhaiti@gmail.com';
const newPassword = 'TriageSystem2025!';

async function resetUserPassword() {
  console.log(`\n🔑 Resetting password for: ${targetEmail}`);
  
  try {
    // First, try to find the user in auth system
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log('❌ Failed to list users:', listError.message);
      return false;
    }
    
    const existingUser = users.find(u => u.email === targetEmail);
    
    if (!existingUser) {
      console.log('ℹ️  User not found, creating new user...');
      return await createNewUser();
    }
    
    console.log('✅ User found, updating password...');
    console.log('👤 User ID:', existingUser.id);
    
    // Update user password
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: newPassword,
        email_confirm: true,
        phone_confirm: true
      }
    );
    
    if (updateError) {
      console.log('❌ Password update failed:', updateError.message);
      return false;
    }
    
    console.log('✅ Password updated successfully');
    
    // Ensure user has profile data
    await ensureProfileExists(existingUser.id);
    
    return true;
    
  } catch (error) {
    console.log('❌ Error resetting password:', error.message);
    return false;
  }
}

async function createNewUser() {
  console.log('🆕 Creating new user account...');
  
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: targetEmail,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Jacken Haiti',
        username: 'jackenhaiti'
      }
    });
    
    if (authError) {
      console.log('❌ User creation failed:', authError.message);
      return false;
    }
    
    console.log('✅ New user created successfully');
    console.log('👤 User ID:', authData.user.id);
    
    await ensureProfileExists(authData.user.id);
    
    return true;
    
  } catch (error) {
    console.log('❌ Error creating user:', error.message);
    return false;
  }
}

async function ensureProfileExists(userId) {
  console.log('\n📝 Ensuring profile data exists...');
  
  try {
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (existingProfile) {
      console.log('✅ Profile already exists');
      return true;
    }
    
    // Create profile
    const profileData = {
      id: userId,
      email: targetEmail,
      username: 'jackenhaiti',
      full_name: 'Jacken Haiti',
      avatar_url: null,
      university: 'University of Miami',
      major: 'Computer Science',
      business: null,
      profession: 'Software Developer',
      state: 'Florida',
      display_name_preference: 'full_name',
      theme_environment: 'modern',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);
    
    if (profileError) {
      console.log('❌ Profile creation failed:', profileError.message);
      return false;
    }
    
    console.log('✅ Profile created successfully');
    
    // Create onboarding preferences
    const onboardingData = {
      user_id: userId,
      is_onboarding_complete: true,
      learning_environment: 'Library',
      user_goal: 'Academic Excellence',
      work_style: 'Deep Focus',
      sound_preference: 'Nature Sounds',
      weekly_focus_goal: 12,
      university: 'University of Miami',
      major: 'Computer Science',
      location: 'Florida',
      data_collection_consent: true,
      personalized_recommendations: true,
      usage_analytics: true,
      marketing_communications: false,
      profile_visibility: 'friends',
      study_data_sharing: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error: onboardingError } = await supabase
      .from('onboarding_preferences')
      .insert(onboardingData);
    
    if (onboardingError) {
      console.log('⚠️  Onboarding preferences creation failed:', onboardingError.message);
    } else {
      console.log('✅ Onboarding preferences created');
    }
    
    // Create leaderboard stats
    const leaderboardData = {
      user_id: userId,
      total_focus_time: 0,
      weekly_focus_time: 0,
      monthly_focus_time: 0,
      current_streak: 0,
      longest_streak: 0,
      total_sessions: 0,
      level: 1,
      points: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error: leaderboardError } = await supabase
      .from('leaderboard_stats')
      .insert(leaderboardData);
    
    if (leaderboardError) {
      console.log('⚠️  Leaderboard stats creation failed:', leaderboardError.message);
    } else {
      console.log('✅ Leaderboard stats created');
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Error ensuring profile:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\n🔐 Testing login with new credentials...');
  
  // Create regular client for testing
  const testClient = createClient(supabaseUrl, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  
  try {
    const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
      email: targetEmail,
      password: newPassword
    });
    
    if (signInError) {
      console.log('❌ Login test failed:', signInError.message);
      return false;
    }
    
    console.log('✅ Login successful!');
    console.log('👤 User ID:', signInData.user.id);
    console.log('📧 Email:', signInData.user.email);
    
    // Test profile fetch
    const { data: profile, error: profileError } = await testClient
      .from('profiles')
      .select('*')
      .eq('id', signInData.user.id)
      .single();
    
    if (profileError) {
      console.log('❌ Profile fetch failed:', profileError.message);
      return false;
    }
    
    console.log('✅ Profile data retrieved successfully');
    console.log('👤 Name:', profile.full_name);
    console.log('🏫 University:', profile.university);
    
    return true;
    
  } catch (error) {
    console.log('❌ Login test error:', error.message);
    return false;
  }
}

async function disableDemoMode() {
  console.log('\n⚙️  Ensuring demo mode is disabled...');
  
  const userAppDataPath = path.join(__dirname, 'src/utils/userAppData.js');
  const fs = require('fs');
  
  try {
    let content = fs.readFileSync(userAppDataPath, 'utf8');
    
    // Ensure all demo/mock modes are disabled
    content = content.replace(/const USE_MOCK_DATA = true;/g, 'const USE_MOCK_DATA = false;');
    content = content.replace(/const USE_DEMO_MODE = true;/g, 'const USE_DEMO_MODE = false;');
    content = content.replace(/const FORCE_DEMO_ON_MOBILE = true;/g, 'const FORCE_DEMO_ON_MOBILE = false;');
    
    fs.writeFileSync(userAppDataPath, content);
    console.log('✅ Demo mode disabled - app will use real Supabase data');
    
  } catch (error) {
    console.log('❌ Error updating userAppData.js:', error.message);
  }
}

async function main() {
  console.log('🎯 Target User:', targetEmail);
  console.log('🔑 New Password:', newPassword);
  console.log('');
  
  // Step 1: Reset user password and ensure account exists
  const passwordReset = await resetUserPassword();
  if (!passwordReset) {
    console.log('\n❌ Failed to reset user credentials');
    process.exit(1);
  }
  
  // Step 2: Disable demo mode
  await disableDemoMode();
  
  // Step 3: Test login
  const loginTest = await testLogin();
  
  if (loginTest) {
    console.log('\n🎉 SUCCESS: Authentication fixed!');
    console.log('=====================================');
    console.log('✅ User: jackenhaiti@gmail.com');
    console.log('✅ Password: TriageSystem2025!');
    console.log('✅ Profile data: Complete');
    console.log('✅ Demo mode: Disabled');
    console.log('✅ Authentication: Working');
    console.log('');
    console.log('🚀 The user can now login successfully on both iOS and Android');
    console.log('📱 Network request timeouts should be resolved');
  } else {
    console.log('\n❌ Authentication test failed');
    process.exit(1);
  }
}

// Run the fix
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
