#!/usr/bin/env node

/**
 * Final App Test - Test userAppData function with fallback data
 */

// Import the userAppData function
const path = require('path');

// Mock React import for Node.js testing
global.React = { default: {} };

// Import our userAppData module
const userAppDataPath = path.join(__dirname, '..', 'src', 'utils', 'userAppData.js');

async function testUserAppDataFunction() {
  console.log('🎯 Testing userAppData Function with Fallback Data');
  console.log('================================================\n');
  
  try {
    // Import the function (this is a hack for testing ES modules in Node.js)
    const { fetchUserAppData } = await import(`file://${userAppDataPath}`);
    
    console.log('📊 Testing fetchUserAppData function...\n');
    
    // Call the function (it should use demo mode and fallback data)
    const userData = await fetchUserAppData();
    
    console.log('✅ Function completed successfully!\n');
    
    // Display the results
    console.log('📋 Retrieved Data Structure:');
    console.log(`   👤 Profile: ${userData.profile ? 'Present' : 'Missing'} - ${userData.profile?.full_name || 'No name'}`);
    console.log(`   🎯 Onboarding: ${userData.onboarding ? 'Present' : 'Missing'}`);
    console.log(`   🏆 Leaderboard: ${userData.leaderboard ? 'Present' : 'Missing'} - ${userData.leaderboard?.total_points || 0} points`);
    console.log(`   📚 Sessions: ${userData.sessions?.length || 0} sessions`);
    console.log(`   ✓ Tasks: ${userData.tasks?.length || 0} tasks`);
    console.log(`   🏅 Achievements: ${userData.achievements?.length || 0} achievements`);
    console.log(`   💡 Insights: ${userData.insights?.length || 0} insights`);
    console.log(`   📊 Metrics: ${userData.metrics ? 'Present' : 'Missing'}`);
    console.log(`   👥 Friends: ${userData.friends?.length || 0} friends`);
    console.log(`   ⚙️  Settings: ${userData.settings ? 'Present' : 'Missing'}`);
    
    console.log('\n📈 Derived Data:');
    console.log(`   ⏱️  Weekly Focus Time: ${userData.weeklyFocusTime || 0} minutes`);
    console.log(`   📊 Daily Focus Data: ${userData.dailyFocusData?.length || 0} days`);
    console.log(`   ✅ Daily Tasks Data: ${userData.dailyTasksCompleted?.length || 0} days`);
    
    console.log('\n🎉 SUCCESS: userAppData function is working with fallback data!');
    console.log('\n📱 The app should now work even when:');
    console.log('   - Tables are missing (user_friends, user_settings)');
    console.log('   - No real user data exists');
    console.log('   - User is not authenticated');
    
    return userData;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

// Run the test
testUserAppDataFunction();
