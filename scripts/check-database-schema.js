const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ucculvnodabrfwbkzsnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY3Vsdm5vZGFicmZ3Ymt6c254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDQxODksImV4cCI6MjA1NzgyMDE4OX0._tWjZyUAafkMNi5fAOmrgJZu3yuzz_G--S0Wi0qVF1A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTasksTableSchema() {
  try {
    console.log('🔍 Checking tasks table schema...\n');
    
    // Get table information
    const { data: tableInfo, error: tableError } = await supabase.rpc(
      'exec_sql', 
      { 
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'tasks' 
          ORDER BY ordinal_position;
        `
      }
    );

    if (tableError) {
      console.log('❌ Error getting table info with RPC, trying direct query...');
      
      // Try a direct query to the tasks table to see what columns exist
      const { data: sample, error: sampleError } = await supabase
        .from('tasks')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.log('❌ Error querying tasks table:', sampleError.message);
        
        // If we get a constraint error about 'order', that means the column exists
        if (sampleError.message.includes('order')) {
          console.log('🚨 ERROR FOUND: The error mentions "order" column!');
          console.log('This suggests the database actually HAS an order column despite our schema files');
        }
      } else {
        console.log('✅ Tasks table exists and is queryable');
        if (sample && sample.length > 0) {
          console.log('📋 Sample task columns:', Object.keys(sample[0]));
        } else {
          console.log('📋 No tasks found, but table structure is accessible');
        }
      }
    } else {
      console.log('✅ Table schema retrieved:');
      console.table(tableInfo);
      
      const hasOrderColumn = tableInfo.some(col => col.column_name === 'order');
      if (hasOrderColumn) {
        console.log('🚨 WARNING: The tasks table DOES have an order column!');
      } else {
        console.log('✅ Confirmed: No order column in tasks table');
      }
    }

    // Test task creation without order
    console.log('\n🧪 Testing task creation without order column...');
    
    const testTask = {
      title: 'Test Task - Schema Check',
      description: 'Testing if we can create without order',
      priority: 'medium',
      status: 'pending'
    };

    const { data: createResult, error: createError } = await supabase
      .from('tasks')
      .insert([testTask])
      .select();

    if (createError) {
      console.log('❌ Task creation failed:', createError.message);
      
      if (createError.message.includes('order')) {
        console.log('🚨 CONFIRMED: Error is about order column constraint!');
        console.log('This means the database schema has an order column that requires a value.');
      }
    } else {
      console.log('✅ Task created successfully!');
      console.log('📋 Created task columns:', Object.keys(createResult[0]));
      
      // Clean up test task
      await supabase
        .from('tasks')
        .delete()
        .eq('id', createResult[0].id);
      
      console.log('🧹 Test task cleaned up');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

checkTasksTableSchema();
