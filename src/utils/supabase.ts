// Supabase Configuration for "The Full Triage System"
// Project: ucculvnodabrfwbkzsnx (The Full Triage System)
// URL: https://ucculvnodabrfwbkzsnx.supabase.co
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FORCE CLOUD CONFIGURATION - No localhost allowed
const CLOUD_SUPABASE_URL = 'https://ucculvnodabrfwbkzsnx.supabase.co';
const CLOUD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjY3Vsdm5vZGFicmZ3Ymt6c254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNDQxODksImV4cCI6MjA1NzgyMDE4OX0._tWjZyUAafkMNi5fAOmrgJZu3yuzz_G--S0Wi0qVF1A';

// Get environment variables but override if localhost
const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Force cloud configuration - never use localhost
const supabaseUrl = (envUrl?.includes('localhost') || !envUrl) ? CLOUD_SUPABASE_URL : envUrl;
const supabaseAnonKey = envKey || CLOUD_ANON_KEY;

console.log("Supabase Init - URL:", supabaseUrl);
console.log("Supabase Init - Anon Key:", supabaseAnonKey ? "Loaded" : "MISSING!");

// Validation - fail if still localhost somehow
if (supabaseUrl.includes('localhost')) {
  console.error("🚨 CRITICAL ERROR: Localhost detected in final URL!");
  throw new Error("Localhost configuration detected - forcing cloud URL");
}

console.log("✅ Using Cloud Supabase URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: AsyncStorage,
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'x-my-custom-header': 'the-full-triage-system',
      'x-project-name': 'The Full Triage System'
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Timeout wrapper for all Supabase operations
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 10000
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
};
