#!/usr/bin/env node

/**
 * Quick App Verification
 * Tests the current app state and provides immediate feedback
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function quickAppCheck() {
  console.log('🎯 Study Tracker App - Quick Verification\n');
  
  // 1. Check Expo development server
  console.log('📱 1. Development Server Status');
  try {
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:8081');
    if (response.ok) {
      console.log('   ✅ Expo development server is running');
      console.log('   🌐 App accessible at: http://localhost:8081');
    } else {
      console.log('   ⚠️  Development server may not be running properly');
    }
  } catch (error) {
    console.log('   ❌ Development server is not accessible');
    console.log('   💡 Run: npm start -- --clear');
  }
  
  // 2. Check database connectivity
  console.log('\n🗄️  2. Database Connectivity');
  if (!supabaseUrl || !supabaseKey) {
    console.log('   ❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.log(`   ⚠️  Database query issue: ${error.message}`);
    } else {
      console.log('   ✅ Database connection working');
    }
  } catch (err) {
    console.log(`   ❌ Database connection failed: ${err.message}`);
  }
  
  // 3. Check current session timer setting
  console.log('\n⏱️  3. Session Timer Configuration');
  try {
    const fs = require('fs');
    const studySessionPath = path.join(__dirname, '..', 'src', 'screens', 'main', 'StudySessionScreen.tsx');
    const content = fs.readFileSync(studySessionPath, 'utf8');
    
    if (content.includes('FOCUS_DURATION = 10')) {
      console.log('   ✅ Focus duration set to 10 seconds (testing mode)');
    } else if (content.includes('FOCUS_DURATION = 45 * 60')) {
      console.log('   📋 Focus duration set to 45 minutes (production mode)');
      console.log('   💡 Consider setting to 10 seconds for rapid testing');
    } else {
      console.log('   ⚠️  Could not determine focus duration setting');
    }
  } catch (err) {
    console.log('   ❌ Could not check timer configuration');
  }
  
  // 4. Check migration status
  console.log('\n🔧 4. Database Migration Status');
  try {
    const { data, error } = await supabase.from('tasks').select('*').limit(1);
    if (error) {
      console.log(`   ⚠️  Tasks table issue: ${error.message}`);
    } else {
      const hasOrderColumn = data && data.length > 0 && 'order' in data[0];
      console.log(`   📋 Order column exists: ${hasOrderColumn ? 'Yes ✅' : 'No ⚠️'}`);
      if (!hasOrderColumn) {
        console.log('   💡 Database migration needed for task creation');
      }
    }
  } catch (err) {
    console.log(`   ❌ Could not check migration status: ${err.message}`);
  }
  
  // 5. Provide next steps
  console.log('\n🎯 Next Steps');
  console.log('');
  console.log('✅ READY TO TEST NOW:');
  console.log('   1. Open browser to http://localhost:8081');
  console.log('   2. Use Expo Go app to scan QR code for mobile testing');
  console.log('   3. Test study session flow (Home → Start Focus Session)');
  console.log('   4. Verify session data appears on break timer screen');
  console.log('');
  console.log('📋 FOR FULL FUNCTIONALITY:');
  console.log('   1. Apply database migration via Supabase dashboard');
  console.log('   2. Use migration_order_column_clean.sql');
  console.log('   3. Test task creation after migration');
  console.log('');
  console.log('🔗 Useful Links:');
  console.log('   • App: http://localhost:8081');
  console.log('   • Supabase: https://ucculvnodabrfwbkzsnx.supabase.co');
  console.log('   • Test Guide: test_session_data_flow.md');
  console.log('   • Status: STUDY_SESSION_TESTING_STATUS.md');
}

// Run the check
quickAppCheck().catch(console.error);
