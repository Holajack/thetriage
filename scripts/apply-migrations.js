// Path: scripts/apply-migrations.js
// This script applies all required migrations to the database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = 'https://ucculvnodabrfwbkzsnx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY is required. Please add it to your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  console.log('🔄 Applying database migrations...\n');
  
  try {
    // 1. Apply onboarding_preferences table migrations
    console.log('📋 Applying onboarding_preferences table migrations...');
    const onboardingMigrationPath = path.join(__dirname, '..', 'create_onboarding_tables.sql');
    const onboardingSql = fs.readFileSync(onboardingMigrationPath, 'utf8');
    
    const { error: onboardingError } = await supabase.rpc('exec_sql', { query: onboardingSql });
    
    if (onboardingError) {
      console.error('❌ Error applying onboarding migrations:', onboardingError);
    } else {
      console.log('✅ Onboarding migrations applied successfully');
    }
    
    // 2. Apply leaderboard_stats RLS policies
    console.log('\n🔒 Applying leaderboard_stats RLS policies...');
    const leaderboardMigrationPath = path.join(__dirname, '..', '20240729000000_add_rls_to_leaderboard_stats.sql');
    const leaderboardSql = fs.readFileSync(leaderboardMigrationPath, 'utf8');
    
    const { error: leaderboardError } = await supabase.rpc('exec_sql', { query: leaderboardSql });
    
    if (leaderboardError) {
      console.error('❌ Error applying leaderboard RLS policies:', leaderboardError);
    } else {
      console.log('✅ Leaderboard RLS policies applied successfully');
    }
    
    // Verify migrations
    console.log('\n🔍 Verifying migrations...');
    
    // Check onboarding_preferences columns
    const { data: onboardingColumns, error: columnsError } = await supabase.rpc('exec_sql', { 
      query: "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'onboarding_preferences' ORDER BY column_name;" 
    });
    
    if (columnsError) {
      console.error('❌ Error checking onboarding columns:', columnsError);
    } else {
      const requiredColumns = [
        'created_at', 'data_collection_consent', 'education_level', 'focus_method',
        'id', 'is_onboarding_complete', 'learning_environment', 'location', 
        'major', 'marketing_communications', 'personalized_recommendations', 
        'profile_visibility', 'sound_preference', 'study_data_sharing', 
        'timezone', 'university', 'updated_at', 'usage_analytics', 
        'user_goal', 'user_id', 'weekly_focus_goal', 'work_style'
      ];
      
      const columnNames = onboardingColumns.map(row => row.column_name);
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`⚠️ Missing onboarding columns: ${missingColumns.join(', ')}`);
      } else {
        console.log('✅ All required onboarding columns present');
      }
    }
    
    // Check leaderboard_stats RLS policies
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', { 
      query: "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'leaderboard_stats';" 
    });
    
    if (policiesError) {
      console.error('❌ Error checking RLS policies:', policiesError);
    } else {
      console.log(`✅ Found ${policies.length} RLS policies on leaderboard_stats table`);
      
      const requiredPolicies = [
        { cmd: 'SELECT' }, 
        { cmd: 'INSERT' }, 
        { cmd: 'UPDATE' }, 
        { cmd: 'DELETE' }
      ];
      
      const commandsFound = policies.map(p => p.cmd);
      const missingCommands = requiredPolicies.filter(p => !commandsFound.includes(p.cmd));
      
      if (missingCommands.length > 0) {
        console.log(`⚠️ Missing RLS policies for commands: ${missingCommands.map(c => c.cmd).join(', ')}`);
      } else {
        console.log('✅ All required RLS policies are in place');
      }
    }
    
    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return false;
  }
}

// Run migrations
applyMigrations()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Migrations applied successfully!');
    } else {
      console.log('\n⚠️ There were issues applying migrations. Check the errors above.');
    }
    process.exit(success ? 0 : 1);
  });
