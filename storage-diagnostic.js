// Create storage-diagnostic.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 COMPREHENSIVE STORAGE DIAGNOSTIC');
console.log('====================================');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function comprehensiveStorageDiagnostic() {
  try {
    // 1. Test basic database access
    console.log('1. Testing basic database access...');
    const { data: profileTest, error: profileError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profileError) {
      console.log('❌ Database access failed:', profileError.message);
      return;
    }
    console.log('✅ Database access working');

    // 2. Test storage bucket listing with different approaches
    console.log('\n2. Testing storage bucket access...');
    
    // Approach A: Standard bucket listing
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.log('❌ Standard bucket listing failed:', bucketsError.message);
        console.log('   Error code:', bucketsError.code);
        console.log('   Error details:', bucketsError.details);
        console.log('   Error hint:', bucketsError.hint);
      } else {
        console.log('✅ Standard bucket listing successful');
        console.log('   Buckets found:', buckets.length);
        buckets.forEach(bucket => {
          console.log(`   📁 ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`);
        });
        
        // If we found buckets, test music bucket access
        const musicBucket = buckets.find(b => b.name === 'music');
        if (musicBucket) {
          await testMusicBucketAccess();
          return;
        } else {
          console.log('   ⚠️  Music bucket not found in list');
        }
      }
    } catch (bucketError) {
      console.log('❌ Bucket listing threw exception:', bucketError.message);
    }

    // Approach B: Direct bucket access attempt
    console.log('\n3. Testing direct music bucket access...');
    try {
      const { data: musicFiles, error: musicError } = await supabase.storage
        .from('music')
        .list('', { limit: 10 });
      
      if (musicError) {
        console.log('❌ Direct music bucket access failed:', musicError.message);
        console.log('   Error code:', musicError.code);
        
        if (musicError.message.includes('not found')) {
          console.log('   🔧 Bucket does not exist - needs to be created');
        } else if (musicError.message.includes('permission')) {
          console.log('   🔧 Permission issue - check storage policies');
        }
      } else {
        console.log('✅ Direct music bucket access successful');
        console.log(`   Files in root: ${musicFiles.length}`);
        musicFiles.forEach(file => {
          console.log(`   📄 ${file.name}`);
        });
      }
    } catch (directError) {
      console.log('❌ Direct bucket access threw exception:', directError.message);
    }

    // Approach C: Check storage service status
    console.log('\n4. Testing storage service availability...');
    try {
      // Try to access storage configuration
      const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        }
      });
      
      console.log('   Storage service HTTP status:', response.status);
      
      if (response.status === 401) {
        console.log('   🔧 Unauthorized - anon key may not have storage permissions');
      } else if (response.status === 404) {
        console.log('   🔧 Storage service not found - may not be enabled');
      } else if (response.status === 200) {
        const bucketData = await response.json();
        console.log('   ✅ Storage service responding');
        console.log('   Buckets via HTTP:', bucketData.length || 0);
      }
    } catch (httpError) {
      console.log('   ❌ Storage HTTP test failed:', httpError.message);
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

async function testMusicBucketAccess() {
  console.log('\n🎵 Testing music bucket contents...');
  
  try {
    // Test listing files in music bucket root
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from('music')
      .list('', { limit: 100 });
    
    if (rootError) {
      console.log('❌ Cannot list music bucket root:', rootError.message);
      return;
    }
    
    console.log(`✅ Music bucket root: ${rootFiles.length} items`);
    rootFiles.forEach(item => {
      console.log(`   ${item.name.includes('.') ? '🎵' : '📁'} ${item.name}`);
    });
    
    // Test specific folders
    const folders = ['Ambient', 'Classical', 'Jazz Ambient', 'Lo-Fi', 'Nature'];
    for (const folder of folders.slice(0, 2)) { // Test first 2 folders
      const { data: folderFiles, error: folderError } = await supabase.storage
        .from('music')
        .list(folder, { limit: 10 });
      
      if (folderError) {
        console.log(`❌ Cannot access ${folder}:`, folderError.message);
      } else {
        console.log(`✅ ${folder}: ${folderFiles.length} files`);
      }
    }
    
  } catch (error) {
    console.log('❌ Music bucket test failed:', error.message);
  }
}

comprehensiveStorageDiagnostic();