// Create verify-project.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 PROJECT VERIFICATION');
console.log('=======================');
console.log('Environment URL:', supabaseUrl);
console.log('Expected URL:   https://ucculvnodabrfwbkzsnx.supabase.co');
console.log('URLs Match:', supabaseUrl === 'https://ucculvnodabrfwbkzsnx.supabase.co');

// Extract project ID from URL
const projectId = supabaseUrl?.split('//')[1]?.split('.')[0];
console.log('Project ID:', projectId);
console.log('Expected ID: ucculvnodabrfwbkzsnx');
console.log('IDs Match:', projectId === 'ucculvnodabrfwbkzsnx');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyProject() {
  try {
    console.log('\n🔗 Testing connection...');
    
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Connection failed:', error.message);
    } else {
      console.log('✅ Connected successfully to project');
    }
    
    // Test storage specifically
    console.log('\n📦 Testing storage access...');
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    
    if (storageError) {
      console.log('❌ Storage access failed:', storageError.message);
      console.log('   This might indicate:');
      console.log('   - Wrong project credentials');
      console.log('   - Storage not enabled');
      console.log('   - Permission issues');
    } else {
      console.log('✅ Storage accessible');
      console.log('📋 Buckets found:', buckets.map(b => b.name));
      
      // Check for music bucket specifically
      const musicBucket = buckets.find(b => b.name === 'music');
      if (musicBucket) {
        console.log('🎵 Music bucket found!');
        console.log('   Public:', musicBucket.public);
      } else {
        console.log('❌ Music bucket not found');
        console.log('   Available buckets:', buckets.map(b => b.name).join(', '));
      }
    }
    
  } catch (error) {
    console.log('❌ Verification failed:', error.message);
  }
}

verifyProject();