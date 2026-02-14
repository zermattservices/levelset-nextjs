/**
 * Supabase Client Configuration
 * Mobile app Supabase client with AsyncStorage persistence
 */

import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://pcplqsnilhrhupntibuv.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcGxxc25pbGhyaHVwbnRpYnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDcyODYsImV4cCI6MjA3NTAyMzI4Nn0.sc7FhfCdbNPcpe8IwLjjeqDdpLUaQU2tXeJMArXVN98";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Get the redirect URL for OAuth
 */
export function getOAuthRedirectUrl(): string {
  return Linking.createURL("auth/callback");
}

export default supabase;
