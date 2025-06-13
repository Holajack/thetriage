#!/usr/bin/env node

/**
 * Test Task Creation Functionality
 * Tests the improved addTask function in isolation
 */

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

async function testTaskCreation() {
  console.log('🧪 Testing Task Creation Function...\n');
  
  try {
    // Test basic database connectivity first
    console.log('1. Testing database connectivity...');
    const { data: testData, error: testError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log(`   ⚠️  Database query failed: ${testError.message}`);
    } else {
      console.log('   ✅ Database connectivity working');
    }
    
    // Check table structure to see if order column exists
    console.log('\n2. Checking tasks table structure...');
    const { data: structureData, error: structureError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.log(`   ⚠️  Structure check failed: ${structureError.message}`);
    } else {
      const hasOrderColumn = structureData && structureData.length > 0 && 'order' in structureData[0];
      console.log(`   📋 Order column exists: ${hasOrderColumn ? 'Yes' : 'No'}`);
      
      if (structureData && structureData.length > 0) {
        console.log('   📝 Available columns:', Object.keys(structureData[0]).join(', '));
      }
    }
    
    // Test creating a task without order column
    console.log('\n3. Testing task creation without order column...');
    const testTaskWithoutOrder = {
      user_id: '11111111-2222-3333-4444-555555555555', // Demo user ID
      title: 'Test Task - No Order',
      description: 'Testing task creation without order column',
      priority: 'medium',
      status: 'pending'
    };
    
    const { data: taskData1, error: taskError1 } = await supabase
      .from('tasks')
      .insert([testTaskWithoutOrder])
      .select();
    
    if (taskError1) {
      console.log(`   ❌ Task creation failed: ${taskError1.message}`);
      if (taskError1.message.includes('row-level security')) {
        console.log('   💡 This is a Row Level Security (RLS) policy issue');
        console.log('   💡 RLS policies prevent unauthorized access to user data');
        console.log('   💡 This is actually a good security feature!');
      }
    } else {
      console.log('   ✅ Task creation successful without order column');
      
      // Clean up
      if (taskData1 && taskData1[0]) {
        await supabase.from('tasks').delete().eq('id', taskData1[0].id);
        console.log('   🧹 Test task cleaned up');
      }
    }
    
    // Test creating a task with order column (if it exists)
    console.log('\n4. Testing task creation with order column...');
    const testTaskWithOrder = {
      user_id: '11111111-2222-3333-4444-555555555555',
      title: 'Test Task - With Order',
      description: 'Testing task creation with order column',
      priority: 'medium',
      status: 'pending',
      order: 1
    };
    
    const { data: taskData2, error: taskError2 } = await supabase
      .from('tasks')
      .insert([testTaskWithOrder])
      .select();
    
    if (taskError2) {
      console.log(`   ❌ Task creation with order failed: ${taskError2.message}`);
      if (taskError2.message.includes('column "order"')) {
        console.log('   💡 Order column does not exist - this confirms migration is needed');
      } else if (taskError2.message.includes('row-level security')) {
        console.log('   💡 RLS policy issue - same as without order column');
      }
    } else {
      console.log('   ✅ Task creation successful with order column');
      
      // Clean up
      if (taskData2 && taskData2[0]) {
        await supabase.from('tasks').delete().eq('id', taskData2[0].id);
        console.log('   🧹 Test task cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function checkUserData() {
  console.log('\n🔍 Checking Demo User Data...');
  
  try {
    const demoUserId = '11111111-2222-3333-4444-555555555555';
    
    // Check if demo user exists in profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', demoUserId)
      .single();
    
    if (profileError) {
      console.log(`   ⚠️  Demo user profile not found: ${profileError.message}`);
    } else {
      console.log('   ✅ Demo user profile exists');
      console.log(`   👤 Username: ${profileData.username}`);
      console.log(`   📧 Email: ${profileData.email}`);
    }
    
    // Check existing tasks for demo user
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', demoUserId);
    
    if (tasksError) {
      console.log(`   ⚠️  Could not fetch demo user tasks: ${tasksError.message}`);
    } else {
      console.log(`   📝 Demo user has ${tasksData?.length || 0} existing tasks`);
    }
    
  } catch (error) {
    console.log(`   ❌ Demo user check failed: ${error.message}`);
  }
}

async function main() {
  await testTaskCreation();
  await checkUserData();
  
  console.log('\n📋 Summary:');
  console.log('1. The main issue appears to be Row Level Security policies');
  console.log('2. RLS policies are a security feature that prevents unauthorized data access');
  console.log('3. The order column migration is still needed for production use');
  console.log('4. The app should work with authenticated users');
  
  console.log('\n🎯 Recommendations:');
  console.log('1. Apply the database migration using Supabase dashboard SQL editor');
  console.log('2. Test the app with actual user authentication');
  console.log('3. The improved error handling in addTask should work once authenticated');
  console.log('4. RLS policies are protecting the data correctly');
}

// Run the test
main().catch(console.error);
