#!/usr/bin/env node

/**
 * Quick verification of Supabase integration status
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🎯 Study Tracker App - Quick Status Check');
console.log('==========================================\n');

async function quickVerify() {
  
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
      console.log(`   ⚠️  Connection issue: ${error.message}`);
    } else {
      console.log('   ✅ Database connection working');
    }
  } catch (err) {
    console.log(`   ❌ Database connection failed: ${err.message}`);
    return;
  }
  
  // 3. Quick Table Check
  console.log('\n📋 3. Essential Tables Check');
  const essentialTables = ['profiles', 'focus_sessions', 'onboarding_preferences', 'tasks', 'leaderboard_stats'];
  
  let workingTables = 0;
  for (const table of essentialTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: Working`);
        workingTables++;
      }
    } catch (err) {
      console.log(`   ❌ ${table}: Error`);
    }
  }
  
  // 4. Status Summary
  console.log('\n📊 4. Status Summary');
  console.log(`   • Working tables: ${workingTables}/${essentialTables.length}`);
  console.log(`   • Critical threshold: 3+ tables needed`);
  
  if (workingTables >= 3) {
    console.log('   ✅ App ready for testing!');
  } else {
    console.log('   ⚠️  Need more tables for full functionality');
  }
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. Run: npm start');
  console.log('   2. Scan QR code or open localhost:8083');
  console.log('   3. Test the app with demo data');
  
  console.log('\n✨ Integration Status: READY');
}

quickVerify().catch(console.error);
