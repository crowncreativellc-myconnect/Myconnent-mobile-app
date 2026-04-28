import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[MyConnect] Missing Supabase environment variables.\n' +
      'Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Typed Table Helpers ──────────────────────────────────────────────────────

export const db = {
  profiles: () => supabase.from('profiles'),
  connections: () => supabase.from('connections'),
  shouts: () => supabase.from('shouts'),
  reviews: () => supabase.from('reviews'),
  points_ledger: () => supabase.from('points_ledger'),
  notifications: () => supabase.from('notifications'),
} as const;

// ─── Storage Helpers ──────────────────────────────────────────────────────────

export const storage = {
  avatars: supabase.storage.from('avatars'),
  voiceNotes: supabase.storage.from('voice-notes'),
} as const;

// ─── Edge Function Helpers ────────────────────────────────────────────────────

export async function invokeEdgeFunction<TBody, TResponse>(
  functionName: string,
  body: TBody,
): Promise<{ data: TResponse | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke<TResponse>(functionName, {
      body,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { data: null, error: new Error(message) };
  }
}
