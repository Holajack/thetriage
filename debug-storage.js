// Create a temporary file: debug-storage.js in your project root

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 ENHANCED STORAGE BUCKET DEBUG');
console.log('=================================');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function enhancedDebug() {
  try {
    // 1. Test basic Supabase connection
    console.log('\n1. Testing basic Supabase connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.log('❌ Basic connection failed:', healthError.message);
      console.log('🔧 This suggests the Supabase credentials are incorrect or project is inactive');
      return;
    }
    
    console.log('✅ Basic Supabase connection working');
    
    // 2. Test storage service specifically
    console.log('\n2. Testing storage service...');
    
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.log('❌ Storage service error:', bucketsError.message);
        console.log('🔧 Possible causes:');
        console.log('   - Storage not enabled in Supabase project');
        console.log('   - Insufficient permissions for storage access');
        console.log('   - Storage service is disabled');
        return;
      }
      
      console.log('✅ Storage service accessible');
      console.log('📋 Found buckets:', buckets.length);
      
      if (buckets.length === 0) {
        console.log('⚠️  No storage buckets exist in your project!');
        console.log('🔧 You need to create buckets in Supabase Dashboard:');
        console.log('   1. Go to Storage in Supabase Dashboard');
        console.log('   2. Click "New bucket"');
        console.log('   3. Create a bucket named "music"');
        console.log('   4. Set it as Public bucket');
        return;
      }
      
      buckets.forEach(bucket => {
        console.log(`   📁 ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`);
        console.log(`      ID: ${bucket.id}`);
        console.log(`      Created: ${bucket.created_at}`);
        console.log(`      File size limit: ${bucket.file_size_limit || 'No limit'}`);
        console.log(`      Allowed MIME types: ${bucket.allowed_mime_types?.join(', ') || 'All types'}`);
      });
      
      // 3. Test music bucket specifically
      const musicBucket = buckets.find(b => b.name === 'music');
      if (!musicBucket) {
        console.log('\n❌ No "music" bucket found!');
        console.log('🔧 Create a "music" bucket in Supabase Dashboard');
        console.log('Available buckets:', buckets.map(b => b.name).join(', '));
        return;
      }
      
      console.log('\n3. Testing music bucket access...');
      console.log(`✅ Music bucket found: ${musicBucket.name}`);
      console.log(`   Public: ${musicBucket.public}`);
      console.log(`   File size limit: ${musicBucket.file_size_limit || 'No limit'}`);
      
      // 4. Test music bucket contents
      const { data: musicContents, error: musicError } = await supabase.storage
        .from('music')
        .list('', { limit: 100 });
      
      if (musicError) {
        console.log('❌ Cannot access music bucket contents:', musicError.message);
        console.log('🔧 Possible causes:');
        console.log('   - Bucket permissions (RLS policies)');
        console.log('   - Bucket is private but needs public access');
        return;
      }
      
      console.log('\n4. Music bucket contents:');
      console.log(`📂 Found ${musicContents.length} items in root`);
      
      if (musicContents.length === 0) {
        console.log('⚠️  Music bucket is empty!');
        console.log('🔧 Upload your music folders to the bucket:');
        console.log('   - Ambient/');
        console.log('   - Classical/');
        console.log('   - Jazz Ambient/');
        console.log('   - Lo-Fi/');
        console.log('   - Nature/');
        return;
      }
      
      musicContents.forEach(item => {
        const size = item.metadata?.size ? `${Math.round(item.metadata.size / 1024 / 1024 * 100) / 100}MB` : 'unknown size';
        console.log(`   ${item.name.includes('.') ? '🎵' : '📁'} ${item.name} (${size})`);
      });
      
      // 5. Test folder access
      const musicFolders = musicContents.filter(item => !item.name.includes('.'));
      
      if (musicFolders.length > 0) {
        console.log('\n5. Testing folder contents...');
        
        for (const folder of musicFolders.slice(0, 2)) { // Test first 2 folders
          const { data: folderContents, error: folderError } = await supabase.storage
            .from('music')
            .list(folder.name, { limit: 10 });
          
          if (folderError) {
            console.log(`❌ Cannot access ${folder.name}:`, folderError.message);
          } else {
            console.log(`✅ ${folder.name}: ${folderContents.length} files`);
            folderContents.forEach(file => {
              const size = Math.round((file.metadata?.size || 0) / 1024 / 1024 * 100) / 100;
              console.log(`      🎵 ${file.name} (${size}MB)`);
            });
          }
        }
      }
      
      // 6. Test URL generation
      if (musicContents.length > 0) {
        const testItem = musicContents.find(item => item.name.includes('.')) || musicContents[0];
        
        console.log('\n6. Testing URL generation...');
        const { data: urlData } = supabase.storage
          .from('music')
          .getPublicUrl(testItem.name);
        
        console.log(`🔗 Generated URL: ${urlData.publicUrl}`);
        
        // Test URL accessibility
        try {
          const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
          console.log(`📡 URL Status: ${response.status} ${response.statusText}`);
          if (!response.ok) {
            console.log('⚠️  URL not accessible - check bucket public settings');
          }
        } catch (urlError) {
          console.log('❌ URL Test Failed:', urlError.message);
        }
      }
      
    } catch (storageError) {
      console.log('❌ Storage access failed:', storageError.message);
      console.log('🔧 Check if storage is enabled in your Supabase project settings');
    }
    
  } catch (error) {
    console.error('❌ Enhanced debug failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Verify .env file has correct Supabase URL and key');
    console.log('2. Check Supabase project is active and storage is enabled');
    console.log('3. Ensure you have the correct project (The Full Triage System)');
  }
}

enhancedDebug();