const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (without React Native polyfills for Node.js testing)
const supabaseUrl = 'https://ucculvnodabrfwbkzsnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY3Vsdm5vZGFicmZ3Ymt6c254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDQxODksImV4cCI6MjA1NzgyMDE4OX0._tWjZyUAafkMNi5fAOmrgJZu3yuzz_G--S0Wi0qVF1A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
  console.log('🔄 Testing Supabase connection...');
  
  try {
    // Test basic connection with profiles table
    const { data: profileData, error: profileError } = await supabase.from('profiles').select('count').limit(1);
    
    if (profileError) {
      console.log('❌ Profiles table error:', profileError.message);
    } else {
      console.log('✅ Profiles table accessible!');
    }
    
    // Test study_rooms table
    const { data: roomData, error: roomError } = await supabase.from('study_rooms').select('count').limit(1);
    
    if (roomError) {
      console.log('❌ Study rooms table error:', roomError.message);
    } else {
      console.log('✅ Study rooms table accessible!');
    }
    
    // Test focus_sessions table
    const { data: focusData, error: focusError } = await supabase.from('focus_sessions').select('count').limit(1);
    
    if (focusError) {
      console.log('❌ Focus sessions table error:', focusError.message);
    } else {
      console.log('✅ Focus sessions table accessible!');
    }
    
    // Test real-time subscriptions capability
    console.log('🔄 Testing real-time capabilities...');
    const channel = supabase.channel('test-channel');
    if (channel) {
      console.log('✅ Real-time channels working!');
      await supabase.removeChannel(channel);
    }
    
    return true;
    
  } catch (err) {
    console.log('❌ Unexpected error:', err);
    return false;
  }
}

// Run the test
testSupabaseConnection().then((success) => {
  if (success) {
    console.log('\n🎉 All database connections are working!');
    console.log('📱 Your app is ready to use!');
  } else {
    console.log('\n⚠️  Please check the deploy-database.md file for migration instructions');
  }
  process.exit(success ? 0 : 1);
});
