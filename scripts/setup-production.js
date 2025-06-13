#!/usr/bin/env node

/**
 * Production Setup Script for Study Tracker App
 * 
 * This script helps set up the production environment by:
 * 1. Checking Supabase connection
 * 2. Switching from mock data to real data
 * 3. Creating admin user if needed
 * 4. Verifying all tables exist and have data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Import our utilities
const { getMockAdminData } = require('./mock-admin-data');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🚀 Study Tracker Production Setup');
console.log('===================================\n');

async function checkSupabaseConnection() {
  console.log('1. Checking Supabase Connection...');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Missing Supabase URL or Anon Key in .env file');
    return false;
  }
  
  console.log(`✅ Supabase URL: ${supabaseUrl}`);
  console.log(`✅ Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
  
  // Test connection with anon key
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Connection test failed: ${error.message}`);
      return false;
    }
    console.log('✅ Successfully connected to Supabase');
    return true;
  } catch (err) {
    console.log(`❌ Connection error: ${err.message}`);
    return false;
  }
}

async function checkServiceKey() {
  console.log('\n2. Checking Service Key...');
  
  if (!supabaseServiceKey || supabaseServiceKey === 'YOUR_ACTUAL_SERVICE_KEY_HERE') {
    console.log('⚠️  Service key not configured');
    console.log('   To create admin users, you need to:');
    console.log('   1. Go to your Supabase project settings');
    console.log('   2. Navigate to API section');
    console.log('   3. Copy the "service_role" key');
    console.log('   4. Update SUPABASE_SERVICE_KEY in .env file');
    return false;
  }
  
  console.log('✅ Service key is configured');
  return true;
}

async function checkTables() {
  console.log('\n3. Checking Database Tables...');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const requiredTables = [
    'user_profiles',
    'user_onboarding',
    'user_leaderboard_stats',
    'focus_sessions',
    'tasks',
    'subtasks',
    'achievements',
    'ai_insights',
    'learning_metrics',
    'user_friends',
    'user_settings'
  ];
  
  const tableStatus = {};
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (error) {
        tableStatus[table] = `❌ Error: ${error.message}`;
      } else {
        tableStatus[table] = `✅ Exists (${data || 0} rows)`;
      }
    } catch (err) {
      tableStatus[table] = `❌ Not accessible: ${err.message}`;
    }
  }
  
  console.log('Table Status:');
  for (const [table, status] of Object.entries(tableStatus)) {
    console.log(`   ${table}: ${status}`);
  }
  
  return Object.values(tableStatus).every(status => status.includes('✅'));
}

async function updateDataFlag() {
  console.log('\n4. Updating Data Configuration...');
  
  const userAppDataPath = '/Users/jackenholland/The Triage System/StudyTrackerNew/src/utils/userAppData.js';
  
  try {
    const fs = require('fs');
    let content = fs.readFileSync(userAppDataPath, 'utf8');
    
    if (content.includes('const USE_MOCK_DATA = true')) {
      content = content.replace('const USE_MOCK_DATA = true', 'const USE_MOCK_DATA = false');
      fs.writeFileSync(userAppDataPath, content);
      console.log('✅ Switched from mock data to real Supabase data');
    } else if (content.includes('const USE_MOCK_DATA = false')) {
      console.log('✅ Already using real Supabase data');
    } else {
      console.log('⚠️  Could not find USE_MOCK_DATA flag');
    }
  } catch (err) {
    console.log(`❌ Error updating data flag: ${err.message}`);
  }
}

async function testLogin() {
  console.log('\n5. Testing Admin Login...');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@studytracker.com',
      password: 'admin123'
    });
    
    if (error) {
      console.log(`⚠️  Admin login failed: ${error.message}`);
      console.log('   You may need to create the admin user first');
      return false;
    }
    
    console.log('✅ Admin login successful');
    console.log(`   User ID: ${data.user.id}`);
    
    // Test data fetch
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
    
    if (profileError) {
      console.log(`⚠️  Profile data missing: ${profileError.message}`);
    } else {
      console.log(`✅ Profile data found for ${profile.full_name}`);
    }
    
    await supabase.auth.signOut();
    return true;
  } catch (err) {
    console.log(`❌ Login test error: ${err.message}`);
    return false;
  }
}

async function main() {
  try {
    const connectionOk = await checkSupabaseConnection();
    const serviceKeyOk = await checkServiceKey();
    const tablesOk = await checkTables();
    
    if (connectionOk && tablesOk) {
      await updateDataFlag();
      await testLogin();
    }
    
    console.log('\n📋 Setup Summary:');
    console.log(`   Database Connection: ${connectionOk ? '✅' : '❌'}`);
    console.log(`   Service Key: ${serviceKeyOk ? '✅' : '⚠️'}`);
    console.log(`   Tables Available: ${tablesOk ? '✅' : '❌'}`);
    
    if (connectionOk && tablesOk) {
      console.log('\n🎉 Production setup is ready!');
      console.log('   You can now run the app with real Supabase data.');
      
      if (!serviceKeyOk) {
        console.log('\n💡 Next steps:');
        console.log('   1. Configure service key to create admin users');
        console.log('   2. Run: node scripts/create-admin-with-data.js');
      }
    } else {
      console.log('\n⚠️  Setup needs attention. Please check the errors above.');
    }
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkSupabaseConnection, checkServiceKey, checkTables };
