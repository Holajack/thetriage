// Create check-sound-files.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🎵 SOUND FILES TABLE ANALYSIS');
console.log('=============================');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeSoundFilesTable() {
  try {
    // 1. Check if sound_files table exists and get sample data
    console.log('1. Testing sound_files table access...');
    const { data: soundFiles, error: soundError } = await supabase
      .from('sound_files')
      .select('*')
      .limit(5);
    
    if (soundError) {
      console.log('❌ Sound files table access failed:', soundError.message);
      return;
    }
    
    console.log('✅ Sound files table accessible');
    console.log(`📊 Found ${soundFiles.length} sample records`);
    
    if (soundFiles.length > 0) {
      console.log('\n2. Table Schema Analysis:');
      const sampleRecord = soundFiles[0];
      console.log('   Columns:', Object.keys(sampleRecord).join(', '));
      
      console.log('\n3. Sample Data:');
      soundFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name || file.title || file.filename || 'Unknown'}`);
        console.log(`      Category: ${file.category || file.type || 'Unknown'}`);
        console.log(`      URL: ${file.url || file.file_url || file.storage_path || 'No URL'}`);
        console.log(`      Duration: ${file.duration || 'Unknown'}`);
      });
      
      // 4. Analyze categories
      const { data: allFiles, error: allError } = await supabase
        .from('sound_files')
        .select('category, type, name, title')
        .limit(100);
      
      if (!allError && allFiles) {
        const categories = [...new Set(allFiles.map(f => f.category || f.type).filter(Boolean))];
        console.log('\n4. Available Categories:');
        categories.forEach(cat => {
          const count = allFiles.filter(f => (f.category || f.type) === cat).length;
          console.log(`   📁 ${cat}: ${count} files`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

analyzeSoundFilesTable();