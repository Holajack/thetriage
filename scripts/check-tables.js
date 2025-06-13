const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndCreateTables() {
  console.log('🔍 Checking existing tables...');
  
  // Check what tables exist by trying to query them
  const tablesToCheck = [
    'profiles',
    'focus_sessions', 
    'onboarding_preferences',
    'leaderboard_stats',
    'tasks',
    'subtasks',
    'achievements',
    'ai_insights',
    'learning_metrics',
    'study_rooms',
    'user_friends',
    'user_settings'
  ];
  
  const existingTables = [];
  const missingTables = [];
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table '${table}' missing: ${error.message}`);
        missingTables.push(table);
      } else {
        console.log(`✅ Table '${table}' exists`);
        existingTables.push(table);
      }
    } catch (err) {
      console.log(`❌ Table '${table}' missing: ${err.message}`);
      missingTables.push(table);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Existing tables: ${existingTables.join(', ')}`);
  console.log(`   ❌ Missing tables: ${missingTables.join(', ')}`);
  
  if (missingTables.length === 0) {
    console.log('\n🎉 All tables exist! Ready to populate with test data.');
  } else {
    console.log(`\n⚠️  Missing ${missingTables.length} tables. These need to be created in Supabase dashboard.`);
    console.log('   Please create these tables manually in your Supabase dashboard.');
  }
  
  return { existingTables, missingTables };
}

// Run the check
checkAndCreateTables();
