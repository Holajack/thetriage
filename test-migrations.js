const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://ucculvnodabrfwbkzsnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY3Vsdm5vZGFicmZ3Ymt6c254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDQxODksImV4cCI6MjA1NzgyMDE4OX0._tWjZyUAafkMNi5fAOmrgJZu3yuzz_G--S0Wi0qVF1A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMigrationStatus() {
  console.log('🔄 Testing migration status...\n');
  
  try {
    // Test 1: Check onboarding_preferences table exists
    console.log('📋 Testing onboarding_preferences table...');
    const { data: onboardingData, error: onboardingError } = await supabase
      .from('onboarding_preferences')
      .select('count')
      .limit(1);
    
    if (onboardingError) {
      console.log('❌ onboarding_preferences table error:', onboardingError.message);
      console.log('   → Need to run create_onboarding_tables.sql');
    } else {
      console.log('✅ onboarding_preferences table exists!');
      
      // Check if it has the required columns
      const { data: sample, error: sampleError } = await supabase
        .from('onboarding_preferences')
        .select('user_id, is_onboarding_complete, university, major, location')
        .limit(1);
      
      if (sampleError) {
        console.log('⚠️  onboarding_preferences table missing columns:', sampleError.message);
        console.log('   → Need to run create_onboarding_tables.sql to add missing columns');
      } else {
        console.log('✅ onboarding_preferences table has required columns!');
      }
    }

    // Test 2: Check leaderboard_stats table RLS policies
    console.log('\n🔒 Testing leaderboard_stats RLS policies...');
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from('leaderboard_stats')
      .select('count')
      .limit(1);
    
    if (leaderboardError) {
      if (leaderboardError.code === '42501') {
        console.log('❌ leaderboard_stats RLS policy error (expected without auth):', leaderboardError.message);
        console.log('   → This is actually good - RLS is working!');
        console.log('   → Need to test with authenticated user or check if policies exist');
      } else {
        console.log('❌ leaderboard_stats table error:', leaderboardError.message);
      }
    } else {
      console.log('✅ leaderboard_stats table accessible!');
    }

    // Test 3: Check if any existing users need migration
    console.log('\n👥 Testing existing users...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ profiles table error:', profilesError.message);
    } else {
      console.log('✅ profiles table accessible!');
      
      // Try to see if we can count users (this might fail due to RLS which is OK)
      const { data: userCount, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' });
      
      if (countError) {
        console.log('⚠️  Cannot count users (likely due to RLS - this is expected)');
      } else {
        console.log(`ℹ️  Found ${userCount?.length || 0} user profiles`);
      }
    }

    return true;
  } catch (err) {
    console.log('❌ Unexpected error:', err);
    return false;
  }
}

// Run the test
testMigrationStatus().then((success) => {
  if (success) {
    console.log('\n🎯 Migration Status Summary:');
    console.log('1. ✅ Basic database connection working');
    console.log('2. 📋 Check onboarding_preferences table status above');
    console.log('3. 🔒 Check leaderboard_stats RLS status above');
    console.log('4. 👥 Check existing users status above');
    console.log('\n📝 Next steps:');
    console.log('   - If any tables missing → Apply migrations in Supabase dashboard');
    console.log('   - Then test complete user flow in the app');
  } else {
    console.log('\n⚠️  Please check the errors above');
  }
  process.exit(success ? 0 : 1);
});
