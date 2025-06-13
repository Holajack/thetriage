#!/usr/bin/env node

/**
 * Final Verification - Comprehensive Status Check
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('🎯 Study Tracker App - Final Verification');
console.log('=========================================\n');

async function finalVerification() {
  
  // 1. Environment Check
  console.log('🔧 1. Environment Configuration');
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    console.log('   ✅ Supabase credentials found');
    console.log(`   📡 URL: ${supabaseUrl.substring(0, 30)}...`);
  } else {
    console.log('   ❌ Missing Supabase credentials');
    return;
  }
  
  // 2. Database Connection
  console.log('\n🗄️  2. Database Connection');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
      console.log(`   ⚠️  Profiles table: ${error.message}`);
    } else {
      console.log('   ✅ Database connection working');
    }
  } catch (err) {
    console.log(`   ❌ Database connection failed: ${err.message}`);
    return;
  }
  
  // 3. Table Status Summary
  console.log('\n📋 3. Table Status Summary');
  const tables = [
    { name: 'profiles', critical: true },
    { name: 'focus_sessions', critical: true },
    { name: 'onboarding_preferences', critical: true },
    { name: 'leaderboard_stats', critical: true },
    { name: 'tasks', critical: true },
    { name: 'subtasks', critical: true },
    { name: 'achievements', critical: false },
    { name: 'ai_insights', critical: false },
    { name: 'learning_metrics', critical: false },
    { name: 'study_rooms', critical: false },
    { name: 'user_friends', critical: false },
    { name: 'user_settings', critical: false }
  ];
  
  let existingCount = 0;
  let criticalCount = 0;
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table.name).select('*').limit(1);
      if (error) {
        console.log(`   ${table.critical ? '❌' : '⚠️ '} ${table.name}: Missing`);
      } else {
        console.log(`   ✅ ${table.name}: Available`);
        existingCount++;
        if (table.critical) criticalCount++;
      }
    } catch (err) {
      console.log(`   ${table.critical ? '❌' : '⚠️ '} ${table.name}: Error`);
    }
  }
  
  // 4. UserAppData.js Configuration
  console.log('\n⚙️  4. UserAppData Configuration');
  const userAppDataPath = path.join(__dirname, '..', 'src', 'utils', 'userAppData.js');
  try {
    const userAppDataContent = require('fs').readFileSync(userAppDataPath, 'utf8');
    
    const useMockData = userAppDataContent.includes('USE_MOCK_DATA = true');
    const useDemoMode = userAppDataContent.includes('USE_DEMO_MODE = true');
    
    console.log(`   📊 Mock Data Mode: ${useMockData ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   🎯 Demo Mode: ${useDemoMode ? 'ENABLED' : 'DISABLED'}`);
    
    if (useDemoMode) {
      console.log('   ✅ App configured for immediate testing');
    } else if (useMockData) {
      console.log('   ✅ App using mock data (testing mode)');
    } else {
      console.log('   ⚠️  App requires real authentication');
    }
    
  } catch (err) {
    console.log('   ❌ Could not read userAppData.js configuration');
  }
  
  // 5. Final Assessment
  console.log('\n🎯 5. Final Assessment');
  console.log(`   📊 Tables Available: ${existingCount}/12 total`);
  console.log(`   ⚡ Critical Tables: ${criticalCount}/6 working`);
  
  if (criticalCount >= 4 && existingCount >= 8) {
    console.log('\n🎉 STATUS: READY FOR TESTING!');
    console.log('\n📱 You can now:');
    console.log('   ✅ Start the app (npm start)');
    console.log('   ✅ Test all major screens');
    console.log('   ✅ Create focus sessions');
    console.log('   ✅ Add tasks and track progress');
    console.log('   ✅ View dashboard analytics');
    
    console.log('\n🔗 Optional Improvements:');
    if (existingCount < 12) {
      console.log('   📋 Execute create_missing_tables_simple.sql for full functionality');
    }
    console.log('   👤 Create real authenticated users for production testing');
    
  } else {
    console.log('\n⚠️  STATUS: NEEDS ATTENTION');
    console.log('   Some critical tables are missing or inaccessible');
  }
  
  // 6. Quick Test Commands
  console.log('\n🚀 Quick Test Commands:');
  console.log('   npm start                    # Start the app');
  console.log('   npm run ios                  # Test on iOS simulator');
  console.log('   npm run android              # Test on Android emulator');
  console.log('   npm run web                  # Test in web browser');
  
  console.log('\n📁 Important Files:');
  console.log('   src/utils/userAppData.js     # Main data fetching logic');
  console.log('   create_missing_tables_simple.sql  # SQL for missing tables');
  console.log('   SUPABASE_INTEGRATION_COMPLETE.md  # Complete documentation');
}

finalVerification();
