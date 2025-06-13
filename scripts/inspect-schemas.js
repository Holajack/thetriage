const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTableSchemas() {
  console.log('🔍 Inspecting actual table schemas...\n');
  
  const tables = [
    'onboarding_preferences',
    'leaderboard_stats', 
    'tasks',
    'focus_sessions'
  ];
  
  for (const table of tables) {
    console.log(`📋 Table: ${table}`);
    try {
      // Try to get one row to see the actual structure
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else {
        if (data && data.length > 0) {
          console.log(`   ✅ Schema (from existing data):`);
          console.log(`      Columns: ${Object.keys(data[0]).join(', ')}`);
        } else {
          console.log(`   ✅ Table accessible but no data exists`);
          
          // Try inserting a test row to see what columns are required/allowed
          console.log(`   🧪 Testing insert to discover schema...`);
          
          let testData = {};
          if (table === 'onboarding_preferences') {
            testData = {
              user_id: '00000000-1111-2222-3333-444444444444',
              preferred_study_duration: 25,
              preferred_break_duration: 5
            };
          } else if (table === 'leaderboard_stats') {
            testData = {
              user_id: '00000000-1111-2222-3333-444444444444',
              total_focus_time: 0,
              sessions_completed: 0,
              current_streak: 0,
              longest_streak: 0,
              total_points: 0,
              rank_position: 1
            };
          } else if (table === 'tasks') {
            testData = {
              user_id: '00000000-1111-2222-3333-444444444444',
              title: 'Test Task',
              description: 'Test Description',
              priority: 'medium',
              status: 'pending'
            };
          }
          
          const { data: insertData, error: insertError } = await supabase
            .from(table)
            .insert(testData)
            .select()
            .single();
          
          if (insertError) {
            console.log(`      ❌ Insert error: ${insertError.message}`);
            
            // Try to parse the error to understand what columns are missing
            if (insertError.message.includes('column')) {
              console.log(`      💡 This suggests the column structure is different`);
            }
          } else {
            console.log(`      ✅ Insert successful! Schema:`);
            console.log(`         Columns: ${Object.keys(insertData).join(', ')}`);
            
            // Clean up test data
            await supabase.from(table).delete().eq('id', insertData.id);
          }
        }
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
    console.log('');
  }
}

inspectTableSchemas();
