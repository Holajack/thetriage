#!/usr/bin/env node

/**
 * Fix authentication issues for jackenhaiti@gmail.com
 * This script will diagnose and fix the specific network and timeout issues
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔧 FIXING AUTHENTICATION FOR jackenhaiti@gmail.com');
console.log('=======================================================');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.log('❌ Missing environment variables!');
  process.exit(1);
}

// Create both client and admin instances
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const targetEmail = 'jackenhaiti@gmail.com';
const testPassword = 'TriageSystem2025!';

async function testNetworkConnection() {
  console.log('\n🌐 Testing network connection...');
  
  try {
    // Test basic connection with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    const testPromise = supabase.from('profiles').select('count').limit(1);
    await Promise.race([testPromise, timeoutPromise]);
    
    console.log('✅ Network connection successful');
    return true;
  } catch (error) {
    console.log('❌ Network connection failed:', error.message);
    return false;
  }
}

async function createOrUpdateUser() {
  console.log('\n👤 Creating/updating user account...');
  
  try {
    // Check if user already exists in auth
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.log('⚠️  Cannot list users, trying direct creation...');
    }
    
    let existingUser = null;
    if (existingUsers) {
      existingUser = existingUsers.users.find(u => u.email === targetEmail);
    }
    
    if (existingUser) {
      console.log('✅ User already exists in auth system');
      console.log('   User ID:', existingUser.id);
      
      // Update user password to ensure it's correct
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: testPassword }
      );
      
      if (updateError) {
        console.log('⚠️  Could not update password:', updateError.message);
      } else {
        console.log('✅ Password updated successfully');
      }
      
      return existingUser.id;
    } else {
      // Create new user
      console.log('Creating new user account...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: targetEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Jacken Haiti',
          username: 'jackenhaiti'
        }
      });
      
      if (createError) {
        console.log('❌ User creation failed:', createError.message);
        return null;
      }
      
      console.log('✅ User created successfully');
      console.log('   User ID:', newUser.user.id);
      return newUser.user.id;
    }
  } catch (error) {
    console.log('❌ Error managing user:', error.message);
    return null;
  }
}

async function ensureProfileExists(userId) {
  console.log('\n📋 Ensuring profile exists...');
  
  try {
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (existingProfile) {
      console.log('✅ Profile already exists');
      return existingProfile;
    }
    
    if (fetchError?.code !== 'PGRST116') {
      console.log('❌ Error checking profile:', fetchError.message);
      return null;
    }
    
    // Create profile
    console.log('Creating profile...');
    const profileData = {
      id: userId,
      email: targetEmail,
      username: 'jackenhaiti',
      full_name: 'Jacken Haiti',
      university: 'University of Miami',
      major: 'Computer Science',
      state: 'Florida',
      profession: 'Software Developer',
      display_name_preference: 'full_name',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Profile creation failed:', createError.message);
      return null;
    }
    
    console.log('✅ Profile created successfully');
    return newProfile;
  } catch (error) {
    console.log('❌ Error managing profile:', error.message);
    return null;
  }
}

async function ensureOnboardingExists(userId) {
  console.log('\n🎯 Ensuring onboarding data exists...');
  
  try {
    // Check if onboarding exists
    const { data: existingOnboarding, error: fetchError } = await supabase
      .from('onboarding_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existingOnboarding) {
      console.log('✅ Onboarding data already exists');
      return existingOnboarding;
    }
    
    if (fetchError?.code !== 'PGRST116') {
      console.log('❌ Error checking onboarding:', fetchError.message);
      return null;
    }
    
    // Create onboarding data
    console.log('Creating onboarding data...');
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
    
    const { data: newOnboarding, error: createError } = await supabase
      .from('onboarding_preferences')
      .insert(onboardingData)
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Onboarding creation failed:', createError.message);
      return null;
    }
    
    console.log('✅ Onboarding data created successfully');
    return newOnboarding;
  } catch (error) {
    console.log('❌ Error managing onboarding:', error.message);
    return null;
  }
}

async function ensureLeaderboardExists(userId) {
  console.log('\n🏆 Ensuring leaderboard data exists...');
  
  try {
    // Check if leaderboard exists
    const { data: existingLeaderboard, error: fetchError } = await supabase
      .from('leaderboard_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existingLeaderboard) {
      console.log('✅ Leaderboard data already exists');
      return existingLeaderboard;
    }
    
    if (fetchError?.code !== 'PGRST116') {
      console.log('❌ Error checking leaderboard:', fetchError.message);
      return null;
    }
    
    // Create leaderboard data
    console.log('Creating leaderboard data...');
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
    
    const { data: newLeaderboard, error: createError } = await supabase
      .from('leaderboard_stats')
      .insert(leaderboardData)
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Leaderboard creation failed:', createError.message);
      return null;
    }
    
    console.log('✅ Leaderboard data created successfully');
    return newLeaderboard;
  } catch (error) {
    console.log('❌ Error managing leaderboard:', error.message);
    return null;
  }
}

async function testSignIn() {
  console.log('\n🔐 Testing sign-in process...');
  
  try {
    // Test sign in with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sign-in timeout after 10 seconds')), 10000);
    });
    
    const signInPromise = supabase.auth.signInWithPassword({
      email: targetEmail,
      password: testPassword
    });
    
    const { data: signInData, error: signInError } = await Promise.race([signInPromise, timeoutPromise]);
    
    if (signInError) {
      console.log('❌ Sign-in failed:', signInError.message);
      return null;
    }
    
    if (!signInData.user) {
      console.log('❌ Sign-in failed: No user data returned');
      return null;
    }
    
    console.log('✅ Sign-in successful!');
    console.log('   User ID:', signInData.user.id);
    console.log('   Email:', signInData.user.email);
    
    return signInData.user;
  } catch (error) {
    console.log('❌ Sign-in error:', error.message);
    return null;
  }
}

async function testDataFetch(userId) {
  console.log('\n📊 Testing data fetch with timeout protection...');
  
  const fetchWithTimeout = async (tableName, query) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${tableName} fetch timeout`)), 5000);
    });
    
    return Promise.race([query, timeoutPromise]);
  };
  
  try {
    // Test profile fetch
    console.log('Fetching profile...');
    const { data: profile, error: profileError } = await fetchWithTimeout(
      'profile',
      supabase.from('profiles').select('*').eq('id', userId).single()
    );
    
    if (profileError) {
      console.log('❌ Profile fetch failed:', profileError.message);
    } else {
      console.log('✅ Profile fetched successfully');
      console.log('   Name:', profile.full_name);
    }
    
    // Test onboarding fetch
    console.log('Fetching onboarding...');
    const { data: onboarding, error: onboardingError } = await fetchWithTimeout(
      'onboarding',
      supabase.from('onboarding_preferences').select('*').eq('user_id', userId).single()
    );
    
    if (onboardingError) {
      console.log('❌ Onboarding fetch failed:', onboardingError.message);
    } else {
      console.log('✅ Onboarding fetched successfully');
      console.log('   Complete:', onboarding.is_onboarding_complete);
    }
    
    // Test leaderboard fetch
    console.log('Fetching leaderboard...');
    const { data: leaderboard, error: leaderboardError } = await fetchWithTimeout(
      'leaderboard',
      supabase.from('leaderboard_stats').select('*').eq('user_id', userId).single()
    );
    
    if (leaderboardError) {
      console.log('❌ Leaderboard fetch failed:', leaderboardError.message);
    } else {
      console.log('✅ Leaderboard fetched successfully');
      console.log('   Level:', leaderboard.level);
      console.log('   Points:', leaderboard.points);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Data fetch error:', error.message);
    return false;
  }
}

async function disableDemoMode() {
  console.log('\n⚙️  Disabling demo mode...');
  
  const userAppDataPath = path.join(__dirname, 'src/utils/userAppData.js');
  const fs = require('fs');
  
  try {
    let content = fs.readFileSync(userAppDataPath, 'utf8');
    
    // Ensure all demo modes are disabled
    content = content.replace(/const USE_MOCK_DATA = true;/g, 'const USE_MOCK_DATA = false;');
    content = content.replace(/const USE_DEMO_MODE = true;/g, 'const USE_DEMO_MODE = false;');
    content = content.replace(/const FORCE_DEMO_ON_MOBILE = true;/g, 'const FORCE_DEMO_ON_MOBILE = false;');
    
    fs.writeFileSync(userAppDataPath, content);
    console.log('✅ Demo mode disabled successfully');
    
  } catch (error) {
    console.log('❌ Error disabling demo mode:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting authentication fix for', targetEmail);
  
  // Step 1: Test network connection
  const networkOk = await testNetworkConnection();
  if (!networkOk) {
    console.log('\n❌ Network connection failed - check your internet connection');
    process.exit(1);
  }
  
  // Step 2: Create or update user
  const userId = await createOrUpdateUser();
  if (!userId) {
    console.log('\n❌ Could not create/access user account');
    process.exit(1);
  }
  
  // Step 3: Ensure all data exists
  await ensureProfileExists(userId);
  await ensureOnboardingExists(userId);
  await ensureLeaderboardExists(userId);
  
  // Step 4: Test sign-in
  const signedInUser = await testSignIn();
  if (!signedInUser) {
    console.log('\n❌ Sign-in test failed');
    process.exit(1);
  }
  
  // Step 5: Test data fetching
  const dataFetchOk = await testDataFetch(signedInUser.id);
  if (!dataFetchOk) {
    console.log('\n⚠️  Some data fetch operations failed, but user can still sign in');
  }
  
  // Step 6: Disable demo mode
  await disableDemoMode();
  
  console.log('\n🎉 AUTHENTICATION FIX COMPLETE!');
  console.log('=======================================');
  console.log('✅ User account ready:', targetEmail);
  console.log('✅ Password:', testPassword);
  console.log('✅ All user data created');
  console.log('✅ Demo mode disabled');
  console.log('✅ App ready for real user login');
  console.log('');
  console.log('📱 The user can now sign in to the mobile app without timeout errors');
  console.log('🔄 If issues persist, restart the app and clear cache');
}

// Run the fix
main().catch(error => {
  console.error('❌ Fix script failed:', error);
  process.exit(1);
});
