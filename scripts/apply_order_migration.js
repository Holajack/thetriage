#!/usr/bin/env node

/**
 * Apply Order Column Migration
 * This script applies the order column migration to the tasks table
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
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

async function applyOrderMigration() {
  console.log('🔧 Applying Order Column Migration to Tasks Table...\n');
  
  try {
    // Step 1: Test connection
    console.log('1. Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1);
    
    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    console.log('   ✅ Database connection successful');
    
    // Step 2: Check if order column already exists
    console.log('\n2. Checking current table structure...');
    const { data: existingTasks, error: structureError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);
    
    if (structureError) {
      throw new Error(`Failed to check table structure: ${structureError.message}`);
    }
    
    const hasOrderColumn = existingTasks && existingTasks.length > 0 && 'order' in existingTasks[0];
    console.log(`   📋 Order column exists: ${hasOrderColumn ? 'Yes' : 'No'}`);
    
    if (hasOrderColumn) {
      console.log('\n✅ Order column already exists! No migration needed.');
      
      // Check if any tasks have null order values
      const { data: nullOrderTasks, error: nullCheckError } = await supabase
        .from('tasks')
        .select('id')
        .is('order', null);
      
      if (nullCheckError) {
        console.log(`   ⚠️  Warning: Could not check for null order values: ${nullCheckError.message}`);
      } else if (nullOrderTasks && nullOrderTasks.length > 0) {
        console.log(`   ⚠️  Found ${nullOrderTasks.length} tasks with null order values`);
        console.log('   💡 You may need to manually update these or run a data repair script');
      } else {
        console.log('   ✅ All tasks have valid order values');
      }
      
      return;
    }
    
    // Step 3: Apply migration using SQL (if we can)
    console.log('\n3. Attempting to apply migration...');
    console.log('   ⚠️  Note: This may require admin privileges');
    
    // Since we can't execute DDL with anon key, we'll show instructions
    console.log('\n📋 MANUAL MIGRATION REQUIRED');
    console.log('=====================================');
    console.log('The order column needs to be added manually via Supabase dashboard:');
    console.log('');
    console.log('1. Go to https://ucculvnodabrfwbkzsnx.supabase.co');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('');
    
    // Read and display the migration SQL
    const migrationPath = path.join(__dirname, '..', 'add_order_column_to_tasks.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('```sql');
    console.log(migrationSQL);
    console.log('```');
    console.log('');
    console.log('4. Click "Run" to execute the migration');
    console.log('5. Verify the migration worked by checking the tasks table structure');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

async function testAfterMigration() {
  console.log('\n🧪 Testing Task Creation After Migration...');
  
  try {
    // Try to create a test task to see if the migration worked
    const { data: session } = await supabase.auth.getSession();
    
    // Use demo user ID for testing
    const testUserId = '11111111-2222-3333-4444-555555555555';
    
    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert([{
        user_id: testUserId,
        title: 'Test Task - Migration Check',
        description: 'This is a test task to verify the migration worked',
        priority: 'medium',
        status: 'pending',
        order: 1
      }])
      .select();
    
    if (createError) {
      if (createError.message.includes('column "order"')) {
        console.log('   ❌ Migration not yet applied - order column missing');
        console.log('   💡 Please apply the migration using the instructions above');
      } else {
        console.log(`   ⚠️  Task creation failed: ${createError.message}`);
      }
    } else {
      console.log('   ✅ Task creation successful! Migration appears to be working.');
      
      // Clean up test task
      if (newTask && newTask[0]) {
        await supabase
          .from('tasks')
          .delete()
          .eq('id', newTask[0].id);
        console.log('   🧹 Test task cleaned up');
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
  }
}

async function main() {
  await applyOrderMigration();
  await testAfterMigration();
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Apply the migration using Supabase dashboard (if not done)');
  console.log('2. Run this script again to verify the migration worked');
  console.log('3. Test task creation in the app');
  console.log('4. Continue with your study session flow testing');
}

// Run the migration
main().catch(console.error);
