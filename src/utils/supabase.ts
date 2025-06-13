// Supabase Configuration for "The Full Triage System"
// Project: ucculvnodabrfwbkzsnx (The Full Triage System)
// URL: https://ucculvnodabrfwbkzsnx.supabase.co
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase Init - URL:", supabaseUrl); // ADD THIS
console.log("Supabase Init - Anon Key:", supabaseAnonKey ? "Loaded" : "MISSING!"); // ADD THIS

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase URL or Anon Key is missing in the app!");
  // You might want to throw an error here or handle it gracefully
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
    persistSession: true,
      storage: AsyncStorage,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 
        'x-my-custom-header': 'the-full-triage-system',
        'x-project-name': 'The Full Triage System'
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
});
