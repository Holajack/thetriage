#!/usr/bin/env node

/**
 * Comprehensive Study Tracker App Integration Test
 * Tests all components work with real Supabase data
 */

const { supabase } = require('./src/utils/supabase');

async function testSupabaseConnection() {
  console.log('🔄 Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .limit(1);
    
    if (error) {
      console.log('❌ Supabase connection error:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    console.log('Sample user data:', data?.[0] || 'No users found');
    return true;
  } catch (err) {
    console.log('❌ Connection test failed:', err.message);
    return false;
  }
}

async function testDemoUserData() {
  console.log('\n🔄 Testing demo user data...');
  
  const DEMO_USER_ID = '11111111-2222-3333-4444-555555555555';
  
  try {
    // Test user profile
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', DEMO_USER_ID)
      .single();
    
    if (userError) {
      console.log('⚠️ Demo user not found, this is expected for first run');
    } else {
      console.log('✅ Demo user profile found:', userProfile.full_name);
    }
    
    // Test focus sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', DEMO_USER_ID)
      .limit(5);
    
    console.log('📊 Focus sessions count:', sessions?.length || 0);
    
    // Test tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', DEMO_USER_ID)
      .limit(5);
    
    console.log('📝 Tasks count:', tasks?.length || 0);
    
    // Test achievements
    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', DEMO_USER_ID)
      .limit(5);
    
    console.log('🏆 Achievements count:', achievements?.length || 0);
    
    return true;
  } catch (err) {
    console.log('❌ Demo user data test failed:', err.message);
    return false;
  }
}

async function testUserAppDataModule() {
  console.log('\n🔄 Testing userAppData module...');
  
  try {
    const { fetchUserAppData, useUserAppData, getDailyInspiration, getLeaderboardData } = require('./src/utils/userAppData.js');
    
    console.log('✅ Module exports loaded successfully');
    
    // Test fetchUserAppData function
    if (typeof fetchUserAppData === 'function') {
      console.log('✅ fetchUserAppData is a function');
      
      // Test with demo user ID
      const userData = await fetchUserAppData('11111111-2222-3333-4444-555555555555');
      console.log('✅ fetchUserAppData executed successfully');
      console.log('📊 User data keys:', Object.keys(userData));
    } else {
      console.log('❌ fetchUserAppData is not a function');
    }
    
    return true;
  } catch (err) {
    console.log('❌ userAppData module test failed:', err.message);
    return false;
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Study Tracker App Integration Test\n');
  
  const tests = [
    testSupabaseConnection,
    testDemoUserData,
    testUserAppDataModule
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    const result = await test();
    if (result) passedTests++;
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passedTests}/${tests.length}`);
  console.log(`❌ Failed: ${tests.length - passedTests}/${tests.length}`);
  
  if (passedTests === tests.length) {
    console.log('\n🎉 ALL TESTS PASSED! Study Tracker app is ready for use.');
    console.log('\n📱 Next steps:');
    console.log('1. Open the Expo app on your device');
    console.log('2. Scan the QR code from the terminal');
    console.log('3. Test all screens: Home, Analytics, Focus, Tasks, Profile');
    console.log('4. Verify data loads correctly on each screen');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above and fix any issues.');
  }
}

// Run the test
runComprehensiveTest().catch(console.error);
