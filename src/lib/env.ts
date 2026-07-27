/**
 * Typed, validated access to build-time environment variables.
 *
 * Only `VITE_*` variables are exposed to the browser bundle — never place a
 * service-role key or private secret here.
 */
import { z } from 'zod';

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  VITE_SUPABASE_ANON_KEY: z.string().min(20).optional().or(z.literal('')),
  VITE_GOOGLE_MAPS_API_KEY: z.string().optional().or(z.literal('')),
  VITE_APP_URL: z.string().url().optional().or(z.literal('')),
});

const parsed = schema.safeParse(import.meta.env);

const raw = parsed.success ? parsed.data : ({} as z.infer<typeof schema>);

export const env = {
  supabaseUrl: raw.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: raw.VITE_SUPABASE_ANON_KEY ?? '',
  googleMapsApiKey: raw.VITE_GOOGLE_MAPS_API_KEY ?? '',
  appUrl:
    raw.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'),
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
} as const;

/** True when Supabase credentials are present and the app can talk to the backend. */
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** True when Google Maps can be initialised. */
export const isMapsConfigured = Boolean(env.googleMapsApiKey);

if (!parsed.success && import.meta.env.DEV) {
  console.warn(
    '[FleetOps] Environment variables failed validation:',
    parsed.error.flatten().fieldErrors,
  );
}
