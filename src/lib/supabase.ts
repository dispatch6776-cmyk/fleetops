import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/types/database.types';

export type FleetOpsClient = SupabaseClient<Database>;

/**
 * Singleton Supabase browser client.
 *
 * - Sessions are persisted in localStorage and auto-refreshed.
 * - PKCE is used for the auth code flow (safe for public clients).
 * - Every table is protected by Row-Level Security, so the anon key is safe
 *   to ship in the bundle.
 */
function createSupabaseClient(): FleetOpsClient {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'fleetops.auth',
    },
    global: {
      headers: { 'x-application-name': 'fleetops' },
    },
    db: { schema: 'public' },
    realtime: { params: { eventsPerSecond: 5 } },
  });
}

let client: FleetOpsClient | null = null;

/** Returns the shared client, or `null` when the app has no credentials yet. */
export function getSupabase(): FleetOpsClient | null {
  if (!isSupabaseConfigured) return null;
  client ??= createSupabaseClient();
  return client;
}

/** Returns the shared client or throws — use inside queries that require auth. */
export function requireSupabase(): FleetOpsClient {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.',
    );
  }
  return supabase;
}

export { isSupabaseConfigured };
