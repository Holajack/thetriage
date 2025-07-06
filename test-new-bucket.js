// Create test-new-bucket.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🎵 TESTING NEW MUSIC BUCKET');
console.log('===========================');

// Debug environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🔧 Environment Check:');
console.log('URL:', supabaseUrl || '❌ MISSING');
console.log('Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '❌ MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('\n❌ Missing environment variables!');
  console.log('   Check that .env file exists with:');
  console.log('   EXPO_PUBLIC_SUPABASE_URL=https://ucculvnodabrfwbkzsnx.supabase.co');
  console.log('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testNewMusicBucket() {
  const bucketName = 'background-music'; // Update this to your bucket name
  
  try {
    // 1. Check if bucket exists
    console.log('\n1. Checking bucket existence...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Cannot list buckets:', bucketsError.message);
      return;
    }
    
    console.log('✅ Storage accessible');
    console.log('📋 Available buckets:', buckets.map(b => b.name));
    
    const musicBucket = buckets.find(b => b.name === bucketName);
    if (!musicBucket) {
      console.log(`\n❌ Bucket "${bucketName}" not found!`);
      console.log('🔧 Create the bucket first in Supabase Dashboard');
      console.log('   1. Go to: https://ucculvnodabrfwbkzsnx.supabase.co');
      console.log('   2. Navigate to Storage');
      console.log('   3. Click "New bucket"');
      console.log(`   4. Name: "${bucketName}"`);
      console.log('   5. Public bucket: ✅ Enable');
      return;
    }
    
    console.log(`✅ Found bucket: ${bucketName} (${musicBucket.public ? 'Public' : 'Private'})`);
    
    // 2. List bucket contents
    console.log('\n2. Listing bucket contents...');
    const { data: rootContents, error: rootError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 100 });
    
    if (rootError) {
      console.log('❌ Cannot access bucket:', rootError.message);
      return;
    }
    
    console.log(`📂 Root contents: ${rootContents.length} items`);
    rootContents.forEach(item => {
      console.log(`   ${item.name.includes('.') ? '🎵' : '📁'} ${item.name}`);
    });
    
    // 3. Test each folder
    const folders = rootContents.filter(item => !item.name.includes('.'));
    
    for (const folder of folders.slice(0, 3)) { // Test first 3 folders
      console.log(`\n3. Testing folder: ${folder.name}`);
      
      const { data: folderContents, error: folderError } = await supabase.storage
        .from(bucketName)
        .list(folder.name, { limit: 10 });
      
      if (folderError) {
        console.log(`   ❌ Cannot access ${folder.name}:`, folderError.message);
      } else {
        console.log(`   ✅ ${folder.name}: ${folderContents.length} files`);
        
        // Test first file URL
        if (folderContents.length > 0) {
          const firstFile = folderContents[0];
          const filePath = `${folder.name}/${firstFile.name}`;
          
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);
          
          console.log(`   🔗 Sample URL: ${urlData.publicUrl}`);
          
          // Test URL accessibility
          try {
            const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
            console.log(`   📡 URL Status: ${response.status} ${response.statusText}`);
          } catch (urlError) {
            console.log(`   ❌ URL Test Failed: ${urlError.message}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewMusicBucket();