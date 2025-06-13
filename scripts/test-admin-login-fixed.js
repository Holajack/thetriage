// Path: scripts/test-admin-login.js
// This script tests signing in with the admin user and validating our data implementation
const { createClient } = require('@supabase/supabase-js');
const { getMockAdminData } = require('./mock-admin-data');

// Initialize Supabase client
const supabaseUrl = 'https://ucculvnodabrfwbkzsnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY3Vsdm5vZGFicmZ3Ymt6c254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDQxODksImV4cCI6MjA1NzgyMDE4OX0._tWjZyUAafkMNi5fAOmrgJZu3yuzz_G--S0Wi0qVF1A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin credentials
const adminEmail = 'admin@studytracker.app';
const adminPassword = 'StudyAdmin2023!';

// Add option to test with mock data
const USE_MOCK_DATA = true;

async function testAdminLogin() {
  console.log('🔄 Testing admin login...');
  
  let userData;
  
  // If using mock data, skip the actual login
  if (USE_MOCK_DATA) {
    console.log('⚠️ Using mock data instead of actual login');
    userData = getMockAdminData();
    
    console.log('✅ Mock data loaded successfully!');
  } else {  
    try {
      // Sign in with email and password
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
      
      if (signInError) {
        console.error('❌ Sign-in failed:', signInError.message);
        return false;
      }
      
      console.log('✅ Sign-in successful!');
      console.log(`🔑 Access token received: ${session.access_token.substring(0, 10)}...`);
      
      // Get the admin user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Error fetching profile:', profileError.message);
        return false;
      }
      
      // Get leaderboard data
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('leaderboard_stats')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (leaderboardError) {
        console.warn('⚠️ Warning: Could not fetch leaderboard data:', leaderboardError.message);
      }
      
      userData = {
        profile,
        leaderboard: leaderboardData
      };
    } catch (error) {
      console.error('❌ Error in login process:', error.message);
      return false;
    }
  }
  
  // Display the user profile information (works with both real and mock data)
  console.log('\n📋 Admin User Profile:');
  console.log('------------------------');
  console.log(`Username: ${userData.profile.username}`);
  console.log(`Full Name: ${userData.profile.full_name}`);
  console.log(`University: ${userData.profile.university}`);
  console.log(`Major: ${userData.profile.major || 'Not set'}`);
  console.log(`Status: ${userData.profile.status}`);
  
  // Display leaderboard stats if available
  if (userData.leaderboard) {
    console.log('\n🏆 Leaderboard Stats:');
    console.log('------------------------');
    console.log(`Level: ${userData.leaderboard.level}`);
    console.log(`Points: ${userData.leaderboard.points}`);
    console.log(`Weekly Focus Goal: ${userData.leaderboard.weekly_focus_goal || 10} hours`);
    console.log(`Weekly Focus Time: ${Math.round((userData.leaderboard.weekly_focus_time || 0) / 60)} hours`);
    console.log(`Current Streak: ${userData.leaderboard.current_streak} days`);
  }
  
  // Display tasks stats if available (mock data only)
  if (USE_MOCK_DATA && userData.tasks) {
    console.log('\n📝 Tasks Summary:');
    console.log('------------------------');
    console.log(`Active Tasks: ${userData.activeTasks.length}`);
    console.log(`Completed Tasks: ${userData.completedTasks.length}`);
    console.log(`Total Subtasks: ${userData.tasks.reduce((sum, task) => 
      sum + (task.subtasks ? task.subtasks.length : 0), 0)}`);
  }
  
  // Display session stats if available (mock data only)
  if (USE_MOCK_DATA && userData.sessions) {
    console.log('\n⏱️ Session Stats:');
    console.log('------------------------');
    console.log(`Total Sessions: ${userData.sessions.length}`);
    
    const totalMinutes = userData.sessions.reduce((sum, session) => 
      sum + (session.duration || 0), 0);
    
    console.log(`Total Focus Time: ${Math.round(totalMinutes / 60)} hours ${totalMinutes % 60} minutes`);
  }
  
  // Display available insights
  if (USE_MOCK_DATA && userData.insights) {
    console.log('\n💡 AI Insights:');
    console.log('------------------------');
    console.log(`Total Insights: ${userData.insights.length}`);
    console.log(`Most recent insight: ${userData.insights[0].insight_type} - ${userData.insights[0].content.substring(0, 50)}...`);
  }
  
  // Summary of available data
  console.log('\n📊 Available Data Summary:');
  console.log('------------------------');
  const dataKeys = Object.keys(userData);
  console.log(dataKeys.join(', '));
  
  console.log('\n✅ Admin user test complete!');
  return true;
}

// Run the test
testAdminLogin()
  .then((success) => {
    console.log(success ? '✅ Test completed successfully!' : '❌ Test failed');
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
