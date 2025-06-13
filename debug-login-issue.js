#!/usr/bin/env node

/**
 * Debug login issue for jackenhaiti@gmail.com
 * Test authentication flow step by step
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugLoginIssue() {
  console.log('🔍 Debugging Login Issue for jackenhaiti@gmail.com');
  console.log('=====================================================');

  // Step 1: Test authentication
  console.log('\n1. Testing authentication...');
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'jackenhaiti@gmail.com',
      password: 'jackentriage2024!'
    });

    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      return;
    }

    console.log('✅ Authentication successful');
    console.log('👤 User ID:', authData.user.id);
    console.log('📧 Email:', authData.user.email);

    // Step 2: Test session check (like AuthContext does)
    console.log('\n2. Testing session check...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session check failed:', sessionError.message);
      return;
    }

    if (!session?.user) {
      console.log('❌ No session found after authentication');
      return;
    }

    console.log('✅ Session exists');
    console.log('👤 Session User ID:', session.user.id);

    // Step 3: Test profile fetch (like AuthContext does)
    console.log('\n3. Testing profile fetch...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.log('❌ Profile fetch failed:', profileError.message);
    } else if (profileError?.code === 'PGRST116') {
      console.log('⚠️  No profile found (user needs profile creation)');
    } else {
      console.log('✅ Profile found');
      console.log('👤 Name:', profile.full_name || profile.username || 'No name set');
    }

    // Step 4: Test onboarding fetch (like AuthContext does)
    console.log('\n4. Testing onboarding fetch...');
    const { data: onboarding, error: onboardingError } = await supabase
      .from('onboarding_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (onboardingError && onboardingError.code !== 'PGRST116') {
      console.log('❌ Onboarding fetch failed:', onboardingError.message);
    } else if (onboardingError?.code === 'PGRST116') {
      console.log('⚠️  No onboarding record found');
    } else {
      console.log('✅ Onboarding record found');
      console.log('🎯 Onboarding complete:', onboarding.is_onboarding_complete);
    }

    // Step 5: Test leaderboard fetch (like AuthContext does)
    console.log('\n5. Testing leaderboard fetch...');
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('leaderboard_stats')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (leaderboardError && leaderboardError.code !== 'PGRST116') {
      console.log('❌ Leaderboard fetch failed:', leaderboardError.message);
    } else if (leaderboardError?.code === 'PGRST116') {
      console.log('⚠️  No leaderboard record found');
    } else {
      console.log('✅ Leaderboard record found');
      console.log('🏆 Level:', leaderboard.level);
    }

    // Step 6: Simulate AuthContext logic
    console.log('\n6. Simulating AuthContext state...');
    
    const authContextState = {
      isAuthenticated: !!session?.user,
      user: profile || { id: session.user.id, email: session.user.email },
      onboarding: onboarding || { 
        id: `fallback-${session.user.id}`,
        user_id: session.user.id, 
        is_onboarding_complete: false, 
        weekly_focus_goal: 5 
      },
      leaderboard: leaderboard || { 
        id: `fallback-${session.user.id}`,
        user_id: session.user.id, 
        total_focus_time: 0, 
        level: 1, 
        points: 0, 
        current_streak: 0 
      },
      hasCompletedOnboarding: onboarding?.is_onboarding_complete || false,
      justLoggedIn: true // This should be set on signIn
    };

    console.log('📊 Final AuthContext state:');
    console.log('   - isAuthenticated:', authContextState.isAuthenticated);
    console.log('   - hasCompletedOnboarding:', authContextState.hasCompletedOnboarding);
    console.log('   - justLoggedIn:', authContextState.justLoggedIn);
    console.log('   - user email:', authContextState.user.email);
    console.log('   - user name:', authContextState.user.full_name || authContextState.user.username || 'No name');

    // Step 7: Determine navigation target
    console.log('\n7. Navigation logic...');
    if (authContextState.isAuthenticated && authContextState.justLoggedIn) {
      if (authContextState.hasCompletedOnboarding) {
        console.log('🎯 Should navigate to: Main (HomeScreen)');
      } else {
        console.log('🎯 Should navigate to: Onboarding');
      }
    } else {
      console.log('❌ User should NOT be navigated anywhere (authentication failed)');
    }

    console.log('\n✅ DIAGNOSIS COMPLETE');
    console.log('===================');
    console.log('The authentication flow is working correctly.');
    console.log('If user cannot login, the issue is likely in:');
    console.log('1. AuthContext timeout handling');
    console.log('2. RootNavigator navigation logic');
    console.log('3. AsyncStorage issues on mobile');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

debugLoginIssue();
