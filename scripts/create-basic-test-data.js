#!/usr/bin/env node

/**
 * Test Script to Create Initial User Data
 * 
 * This creates a test user with basic data using the existing tables
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Creating Test User with Basic Data');
console.log('=====================================\n');

async function createBasicTestData() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test user ID (you could also create a real user through auth)
  const testUserId = '11111111-2222-3333-4444-555555555555';
  
  console.log(`Creating test data for user ID: ${testUserId}\n`);
  
  try {
    // 1. Create profile (if the profiles table allows direct inserts)
    console.log('1. Creating profile...');
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: testUserId,
          username: 'testuser',
          full_name: 'Test User',
          avatar_url: null,
          status: 'online',
          university: 'Test University',
          major: 'Computer Science',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (profileError) {
        console.log(`   Error: ${profileError.message}`);
        console.log(`   Code: ${profileError.code}`);
      } else {
        console.log('   ✅ Profile created/updated');
      }
    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }
    
    // 2. Create onboarding preferences
    console.log('2. Creating onboarding preferences...');
    try {
      const { data: onboarding, error: onboardingError } = await supabase
        .from('onboarding_preferences')
        .upsert({
          user_id: testUserId,
          is_onboarding_complete: true,
          weekly_focus_goal: 600, // 10 hours
          university: 'Test University',
          major: 'Computer Science',
          location: 'Test City',
          data_collection_consent: true,
          personalized_recommendations: true,
          usage_analytics: true,
          marketing_communications: false,
          profile_visibility: 'friends',
          study_data_sharing: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (onboardingError) {
        console.log(`   Error: ${onboardingError.message}`);
        console.log(`   Code: ${onboardingError.code}`);
      } else {
        console.log('   ✅ Onboarding preferences created/updated');
      }
    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }
    
    // 3. Create leaderboard stats
    console.log('3. Creating leaderboard stats...');
    try {
      const { data: leaderboard, error: leaderboardError } = await supabase
        .from('leaderboard_stats')
        .upsert({
          user_id: testUserId,
          total_focus_time: 480, // 8 hours
          sessions_completed: 16,
          current_streak: 4,
          longest_streak: 7,
          achievements_unlocked: 3,
          rank_position: 25,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (leaderboardError) {
        console.log(`   Error: ${leaderboardError.message}`);
        console.log(`   Code: ${leaderboardError.code}`);
      } else {
        console.log('   ✅ Leaderboard stats created/updated');
      }
    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }
    
    // 4. Create focus sessions
    console.log('4. Creating focus sessions...');
    try {
      const sessions = [];
      
      // Create sessions for the last week
      for (let i = 0; i < 7; i++) {
        const sessionDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        sessions.push({
          user_id: testUserId,
          duration: 25 + Math.floor(Math.random() * 35), // 25-60 minutes
          start_time: new Date(sessionDate.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9 AM
          end_time: new Date(sessionDate.getTime() + 9.5 * 60 * 60 * 1000).toISOString(), // 9:30 AM
          focus_score: 70 + Math.floor(Math.random() * 30), // 70-100%
          session_type: 'focus',
          completed: true,
          created_at: sessionDate.toISOString(),
          updated_at: sessionDate.toISOString()
        });
      }
      
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('focus_sessions')
        .upsert(sessions, { onConflict: 'user_id,start_time' })
        .select();
      
      if (sessionsError) {
        console.log(`   Error: ${sessionsError.message}`);
        console.log(`   Code: ${sessionsError.code}`);
      } else {
        console.log(`   ✅ Created ${sessionsData?.length || 0} focus sessions`);
      }
    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }
    
    console.log('\n✅ Basic test data creation completed!');
    console.log(`\nTest User ID: ${testUserId}`);
    console.log('You can now test the app with this basic data.');
    
  } catch (error) {
    console.error('\n❌ Error creating test data:', error.message);
    throw error;
  }
}

async function verifyBasicData() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const testUserId = '11111111-2222-3333-4444-555555555555';
  
  console.log('\n🔍 Verifying basic test data...');
  
  const tables = [
    { name: 'profiles', idField: 'id' },
    { name: 'onboarding_preferences', idField: 'user_id' },
    { name: 'leaderboard_stats', idField: 'user_id' },
    { name: 'focus_sessions', idField: 'user_id' }
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .eq(table.idField, testUserId);
      
      if (error) {
        console.log(`   ${table.name}: ❌ ${error.message}`);
      } else {
        console.log(`   ${table.name}: ✅ ${data.length} records`);
      }
    } catch (err) {
      console.log(`   ${table.name}: ❌ ${err.message}`);
    }
  }
}

async function main() {
  try {
    await createBasicTestData();
    await verifyBasicData();
    
    console.log('\n🎉 Basic test data creation successful!');
    console.log('\n💡 Next steps:');
    console.log('   1. Apply the missing tables migration (create_missing_tables.sql)');
    console.log('   2. Update userAppData.js to work with existing tables');
    console.log('   3. Test the app with real Supabase data');
    
  } catch (error) {
    console.error('\n❌ Test data creation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
