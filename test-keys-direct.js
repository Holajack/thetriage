// Create test-keys-direct.js
const { createClient } = require('@supabase/supabase-js');

// Use your actual keys from Supabase Dashboard → Settings → API
const supabaseUrl = 'https://ucculvnodabrfwbkzsnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY3Vsdm5vZGFicmZ3Ymt6c254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDQxODksImV4cCI6MjA1NzgyMDE4OX0._tWjZyUAafkMNi5fAOmrgJZu3yuzz_G--S0Wi0qVF1A'; // Replace with your anon key

console.log('🔍 TESTING KEYS DIRECTLY');
console.log('========================');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testKeys() {
  try {
    console.log('Testing basic connection...');
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Connection failed:', error.message);
      console.log('   Error code:', error.code);
      return;
    }
    
    console.log('✅ Basic connection successful');
    
    // Test storage
    console.log('\nTesting storage access...');
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    
    if (storageError) {
      console.log('❌ Storage failed:', storageError.message);
      console.log('   Error code:', storageError.code);
    } else {
      console.log('✅ Storage accessible');
      console.log('📋 Buckets found:', buckets.map(b => b.name));
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testKeys();