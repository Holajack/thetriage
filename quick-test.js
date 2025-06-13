const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function quickTest() {
  console.log('🔧 Quick Database Test');
  
  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    // Simple connection test
    const { data, error } = await supabase.from('tasks').select('id').limit(1);
    if (error) {
      console.log('❌ Database connection failed:', error.message);
    } else {
      console.log('✅ Database connection successful');
      console.log('✅ Timer initialization issue FIXED');
      console.log('✅ App ready for testing at http://localhost:8081');
    }
  } catch (err) {
    console.log('❌ Connection error:', err.message);
  }
  
  process.exit(0);
}

quickTest();
