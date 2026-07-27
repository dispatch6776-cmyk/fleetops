import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Role } from '@/lib/permissions';
import type { Profile } from '@/types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  error: string | null;
  initialized: boolean;
  /** Subscribes to Supabase auth changes. Safe to call more than once. */
  initialize: () => Promise<void>;
  /** Re-reads the profile row (role, name, avatar). */
  refreshProfile: () => Promise<void>;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

let unsubscribe: (() => void) | null = null;

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('[FleetOps] Failed to load profile:', error.message);
    return null;
  }
  return (data as Profile | null) ?? null;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'idle',
  session: null,
  user: null,
  profile: null,
  error: null,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    set({ initialized: true, status: 'loading' });

    const supabase = getSupabase();
    if (!supabase) {
      set({
        status: 'unauthenticated',
        error: isSupabaseConfigured ? null : 'Supabase environment variables are missing.',
      });
      return;
    }

    const { data } = await supabase.auth.getSession();
    const session = data.session ?? null;
    const profile = session?.user ? await fetchProfile(session.user.id) : null;

    set({
      session,
      user: session?.user ?? null,
      profile,
      status: session ? 'authenticated' : 'unauthenticated',
    });

    unsubscribe?.();
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === 'SIGNED_OUT' || !nextSession) {
        set({ session: null, user: null, profile: null, status: 'unauthenticated' });
        return;
      }
      const nextProfile =
        get().profile?.id === nextSession.user.id
          ? get().profile
          : await fetchProfile(nextSession.user.id);
      set({
        session: nextSession,
        user: nextSession.user,
        profile: nextProfile,
        status: 'authenticated',
      });
    });
    unsubscribe = () => listener.subscription.unsubscribe();
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    const profile = await fetchProfile(user.id);
    set({ profile });
  },

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      status: session ? 'authenticated' : 'unauthenticated',
    }),

  signOut: async () => {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
    set({ session: null, user: null, profile: null, status: 'unauthenticated' });
  },
}));

/** Current role, defaulting to `viewer` (least privilege) while loading. */
export function useRole(): Role | null {
  return useAuthStore((state) => state.profile?.role ?? null);
}
