#!/usr/bin/env node

/**
 * Check Database Schema and RLS Policies
 * Analyzes the current database structure and security policies
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructures() {
  console.log('🔍 Database Schema Analysis\n');
  
  const tables = ['profiles', 'tasks', 'focus_sessions', 'onboarding_preferences', 'leaderboard_stats'];
  
  for (const tableName of tables) {
    console.log(`📊 Table: ${tableName}`);
    try {
      // Get a sample row to see the structure
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`   ✅ Columns: ${Object.keys(data[0]).join(', ')}`);
      } else {
        console.log(`   📝 Table exists but is empty`);
        
        // Try to insert a test row to see what columns are required
        console.log(`   🧪 Testing insert to discover required columns...`);
        const { error: insertError } = await supabase
          .from(tableName)
          .insert([{}])
          .select();
        
        if (insertError) {
          console.log(`   💡 Required columns hint: ${insertError.message}`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Failed to check table: ${err.message}`);
    }
    console.log('');
  }
}

async function checkAuthenticatedUser() {
  console.log('👤 Authentication Status\n');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log(`❌ Auth error: ${error.message}`);
    } else if (session) {
      console.log('✅ User is authenticated');
      console.log(`   User ID: ${session.user.id}`);
      console.log(`   Email: ${session.user.email}`);
    } else {
      console.log('⚠️  No authenticated user session');
      console.log('   This explains the RLS policy violations');
    }
  } catch (err) {
    console.log(`❌ Auth check failed: ${err.message}`);
  }
}

async function suggestMigrationSteps() {
  console.log('\n🚀 Migration Action Plan\n');
  
  console.log('Based on the analysis, here are the steps to complete the setup:');
  console.log('');
  console.log('1. 📋 **Apply Database Migration**');
  console.log('   - Open Supabase dashboard: https://ucculvnodabrfwbkzsnx.supabase.co');
  console.log('   - Go to SQL Editor');
  console.log('   - Execute the migration in migration_order_column_clean.sql');
  console.log('');
  console.log('2. 🔐 **Test with Authentication**');
  console.log('   - The app needs authenticated users for RLS policies to work');
  console.log('   - Demo mode bypasses authentication but respects RLS');
  console.log('   - Consider creating test users or adjusting RLS policies for demo');
  console.log('');
  console.log('3. 🧪 **Test Study Session Flow**');
  console.log('   - Once migration is applied, test the full study session flow');
  console.log('   - Verify task creation works with authenticated users');
  console.log('   - Test session data passing between screens');
  console.log('');
  console.log('4. 📱 **Resume App Testing**');
  console.log('   - Start the Expo development server');
  console.log('   - Test the study session and break timer functionality');
  console.log('   - Verify session data is properly passed and displayed');
}

async function main() {
  await checkTableStructures();
  await checkAuthenticatedUser();
  await suggestMigrationSteps();
}

main().catch(console.error);
