#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔍 DEBUGGING SIMULATOR NETWORK ISSUES');
console.log('=====================================');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Environment Check:');
console.log('- Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('- Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('\n❌ Environment variables missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testNetworkConnectivity() {
  console.log('\n1. Testing basic network connectivity...');
  
  try {
    // Test with increased timeout for simulator
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout (15s)')), 15000);
    });
    
    const testPromise = supabase.from('profiles').select('count').limit(1);
    const result = await Promise.race([testPromise, timeoutPromise]);
    
    console.log('✅ Basic network connectivity working');
    return true;
  } catch (error) {
    console.log('❌ Network connectivity failed:', error.message);
    
    // Additional diagnostics
    if (error.message.includes('fetch')) {
      console.log('💡 This appears to be a fetch/network error');
      console.log('   - Check if simulator has internet access');
      console.log('   - Try opening a website in simulator Safari');
    }
    
    if (error.message.includes('timeout')) {
      console.log('💡 This is a timeout error');
      console.log('   - Simulator network may be slower than expected');
      console.log('   - Consider increasing timeout values');
    }
    
    return false;
  }
}

async function testAuthEndpoint() {
  console.log('\n2. Testing authentication endpoint...');
  
  try {
    // Test auth endpoint specifically
    const { data: session, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Auth endpoint error:', error.message);
      return false;
    }
    
    console.log('✅ Authentication endpoint accessible');
    return true;
  } catch (error) {
    console.log('❌ Auth endpoint failed:', error.message);
    return false;
  }
}

async function testSignInEndpoint() {
  console.log('\n3. Testing sign-in endpoint (with test credentials)...');
  
  try {
    // Use longer timeout for simulator
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sign-in timeout (20s)')), 20000);
    });
    
    const signInPromise = supabase.auth.signInWithPassword({
      email: 'jackenhaiti@gmail.com',
      password: 'TriageSystem2025!'
    });
    
    const { data, error } = await Promise.race([signInPromise, timeoutPromise]);
    
    if (error) {
      console.log('❌ Sign-in endpoint error:', error.message);
      
      // Specific error diagnostics
      if (error.message.includes('Invalid login credentials')) {
        console.log('💡 Credentials issue - user exists but password incorrect');
      } else if (error.message.includes('fetch')) {
        console.log('💡 Network fetch error during sign-in');
      } else if (error.message.includes('timeout')) {
        console.log('💡 Sign-in request timed out');
      }
      
      return false;
    }
    
    console.log('✅ Sign-in endpoint working');
    console.log('👤 User authenticated:', data.user.email);
    
    // Clean up - sign out
    await supabase.auth.signOut();
    
    return true;
  } catch (error) {
    console.log('❌ Sign-in test failed:', error.message);
    return false;
  }
}

async function main() {
  const networkOk = await testNetworkConnectivity();
  const authOk = await testAuthEndpoint();
  const signInOk = await testSignInEndpoint();
  
  console.log('\n📊 DIAGNOSTIC RESULTS');
  console.log('=====================');
  console.log('Basic Network:', networkOk ? '✅ Working' : '❌ Failed');
  console.log('Auth Endpoint:', authOk ? '✅ Working' : '❌ Failed');
  console.log('Sign-in Flow:', signInOk ? '✅ Working' : '❌ Failed');
  
  if (!networkOk) {
    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('1. Check simulator internet connectivity');
    console.log('2. Restart iOS Simulator');
    console.log('3. Check Mac network connection');
    console.log('4. Try physical device instead of simulator');
  } else if (!authOk || !signInOk) {
    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('1. Increase timeout values in AuthContext');
    console.log('2. Check Supabase project status');
    console.log('3. Verify environment variables in app');
  } else {
    console.log('\n✅ All network tests passed!');
    console.log('The issue may be in the app configuration or AuthContext timeouts.');
  }
}

main().catch(console.error);