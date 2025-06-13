#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🤖 Testing Patrick Edge Function');
console.log('================================');

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

async function testPatrickFunction() {
  try {
    // Step 1: Authenticate as jackenhaiti@gmail.com
    console.log('\n🔐 Step 1: Authenticating user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'jackenhaiti@gmail.com',
      password: 'TriageSystem2025!'
    });

    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      return;
    }

    console.log('✅ Authentication successful');
    console.log('👤 User ID:', authData.user.id);

    // Step 2: Get the session token
    console.log('\n🔑 Step 2: Getting session token...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log('❌ Failed to get session:', sessionError?.message);
      return;
    }

    console.log('✅ Session retrieved');
    console.log('🔑 Access Token (first 20 chars):', session.access_token.substring(0, 20) + '...');

    // Step 3: Test the Patrick Edge Function with detailed debugging
    console.log('\n🧪 Step 3: Testing Patrick Edge Function...');
    console.log('URL: https://ucculvnodabrfwbkzsnx.supabase.co/functions/v1/patrick-response-function');
    
    const requestBody = { 
      message: 'Hello Patrick, can you help me with my studies?',
      userId: authData.user.id 
    };
    
    console.log('📦 Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('🔑 Authorization Header:', `Bearer ${session.access_token.substring(0, 20)}...`);
    
    const response = await fetch('https://ucculvnodabrfwbkzsnx.supabase.co/functions/v1/patrick-response-function', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey, // Sometimes Edge Functions need this too
      },
      body: JSON.stringify(requestBody),
    });

    console.log('\n📡 Response Details:');
    console.log('- Status:', response.status);
    console.log('- Status Text:', response.statusText);
    console.log('- Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('- Raw Response:', responseText);

    if (!response.ok) {
      console.log('\n❌ Edge Function Error Details:');
      console.log('- HTTP Status:', response.status);
      console.log('- Response Body:', responseText);
      
      if (response.status === 401) {
        console.log('\n🔍 JWT Debugging for Status 401:');
        console.log('- The JWT token is being rejected by the Edge Function');
        console.log('- This could mean:');
        console.log('  1. Edge Function doesn\'t have correct JWT secret configured');
        console.log('  2. Token format is incorrect');
        console.log('  3. Token has expired');
        console.log('  4. Edge Function authentication logic has issues');
        
        // Additional JWT debugging
        console.log('\n🔬 Token Analysis:');
        try {
          const tokenParts = session.access_token.split('.');
          console.log('- Token has', tokenParts.length, 'parts (should be 3 for JWT)');
          console.log('- Header (base64):', tokenParts[0]);
          console.log('- Payload (base64):', tokenParts[1]);
          
          // Decode header and payload (for debugging only - don't do this in production)
          const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          
          console.log('- Decoded Header:', header);
          console.log('- Decoded Payload (user info):', {
            sub: payload.sub,
            email: payload.email,
            iat: new Date(payload.iat * 1000).toISOString(),
            exp: new Date(payload.exp * 1000).toISOString()
          });
          
          // Check if token is expired
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp < now) {
            console.log('⚠️  TOKEN IS EXPIRED!');
          } else {
            console.log('✅ Token is not expired');
          }
          
        } catch (tokenError) {
          console.log('❌ Could not decode token:', tokenError.message);
        }
      }
      
      return;
    }

    try {
      const data = JSON.parse(responseText);
      console.log('\n✅ Patrick responded successfully!');
      console.log('🤖 Patrick says:', data.response);
    } catch (parseError) {
      console.log('\n⚠️  Response received but not JSON:', responseText);
    }

  } catch (error) {
    console.log('\n❌ Test failed with error:', error.message);
    console.log('Full error:', error);
  }
}

async function testAlternativeMethod() {
  console.log('\n🔄 Testing Alternative Method (Supabase Client)...');
  
  try {
    // Authenticate first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'jackenhaiti@gmail.com',
      password: 'TriageSystem2025!'
    });

    if (authError) {
      console.log('❌ Auth failed for alternative method:', authError.message);
      return;
    }

    // Use Supabase's built-in function invocation
    const { data, error } = await supabase.functions.invoke('patrick-response-function', {
      body: { 
        message: 'Hello Patrick, this is a test using Supabase client method',
        userId: authData.user.id 
      },
    });

    if (error) {
      console.log('❌ Supabase client method failed:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Supabase client method succeeded!');
      console.log('🤖 Response:', data);
    }

  } catch (error) {
    console.log('❌ Alternative method error:', error.message);
  }
}

async function main() {
  await testPatrickFunction();
  await testAlternativeMethod();
  
  console.log('\n📊 SUMMARY');
  console.log('==========');
  console.log('If you see "Invalid JWT" errors above:');
  console.log('1. Check Supabase Edge Function deployment');
  console.log('2. Verify JWT secret is configured in Edge Function');
  console.log('3. Check Edge Function code for authentication logic');
  console.log('4. Consider redeploying the patrick-response-function');
  console.log('\nTo check Edge Function logs:');
  console.log('supabase functions logs patrick-response-function');
}

main().catch(console.error);