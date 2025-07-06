// Create check-sound-preferences.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSoundPreferences() {
  console.log('🎵 CHECKING SOUND PREFERENCES IN DATABASE');
  console.log('=========================================');
  
  try {
    // Get all unique sound_preference values
    const { data: allFiles, error } = await supabase
      .from('sound_files')
      .select('sound_preference, title, file_path, file_type')
      .limit(100);
    
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    
    console.log(`📊 Total files: ${allFiles.length}`);
    
    // Group by sound_preference
    const preferences = {};
    allFiles.forEach(file => {
      const pref = file.sound_preference || 'No Category';
      if (!preferences[pref]) {
        preferences[pref] = [];
      }
      preferences[pref].push(file);
    });
    
    console.log('\n📋 Sound Preferences Found:');
    Object.entries(preferences).forEach(([pref, files]) => {
      console.log(`\n🎵 "${pref}": ${files.length} files`);
      files.slice(0, 3).forEach(file => {
        console.log(`   - ${file.title}`);
        console.log(`     Path: ${file.file_path || 'No path'}`);
        console.log(`     Type: ${file.file_type || 'Unknown'}`);
      });
      if (files.length > 3) {
        console.log(`   ... and ${files.length - 3} more`);
      }
    });
    
    console.log('\n🔧 Recommended SOUND_PREFERENCE_MAP:');
    const uniquePrefs = Object.keys(preferences).filter(p => p !== 'No Category');
    uniquePrefs.forEach(pref => {
      console.log(`  '${pref}': '${pref.toLowerCase()}',`);
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkSoundPreferences();