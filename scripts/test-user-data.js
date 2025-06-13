const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserAppData() {
  console.log('🧪 Testing User App Data Functionality...\n');
  
  try {
    // Check if we have any users in profiles
    console.log('1. Checking existing profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.log(`❌ Error fetching profiles: ${profilesError.message}`);
      return;
    }
    
    console.log(`✅ Found ${profiles?.length || 0} profiles`);
    if (profiles?.length > 0) {
      console.log(`   First profile: ${profiles[0].id} - ${profiles[0].full_name || profiles[0].username || 'No name'}`);
      
      // Test fetching data for the first user
      const testUserId = profiles[0].id;
      console.log(`\n2. Testing data fetch for user: ${testUserId}`);
      
      // Test each table
      const tables = [
        'onboarding_preferences',
        'leaderboard_stats', 
        'focus_sessions',
        'tasks',
        'achievements',
        'ai_insights',
        'learning_metrics',
        'study_rooms'
      ];
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('user_id', testUserId)
            .limit(1);
          
          if (error) {
            console.log(`   ❌ ${table}: ${error.message}`);
          } else {
            console.log(`   ✅ ${table}: ${data?.length || 0} records`);
          }
        } catch (err) {
          console.log(`   ❌ ${table}: ${err.message}`);
        }
      }
      
      // Test missing tables
      console.log(`\n3. Testing missing tables...`);
      
      const missingTables = ['user_friends', 'user_settings'];
      for (const table of missingTables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (error) {
            console.log(`   ❌ ${table}: ${error.message}`);
          } else {
            console.log(`   ✅ ${table}: Table exists with ${data?.length || 0} records`);
          }
        } catch (err) {
          console.log(`   ❌ ${table}: ${err.message}`);
        }
      }
      
    } else {
      console.log('   No profiles found. Creating a test profile...');
      
      // Try to create a test profile
      const testUserId = '00000000-1111-2222-3333-444444444444';
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: testUserId,
          username: 'testuser',
          full_name: 'Test User',
          avatar_url: null,
          university: 'Test University',
          status: 'active'
        })
        .select()
        .single();
      
      if (createError) {
        console.log(`   ❌ Failed to create profile: ${createError.message}`);
      } else {
        console.log(`   ✅ Created test profile: ${newProfile.id}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUserAppData();
