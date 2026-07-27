import { env } from '@/lib/env';
import { getSupabase, requireSupabase } from '@/lib/supabase';
import type { Profile } from '@/types';

export interface SignInParams {
  email: string;
  password: string;
  remember: boolean;
}

/**
 * Supabase persists the session in localStorage by default. When the user
 * unticks "Remember me" we mirror the tokens into sessionStorage instead, so
 * closing the browser ends the session.
 */
function applyRememberPreference(remember: boolean) {
  try {
    localStorage.setItem('fleetops.remember', remember ? '1' : '0');
    if (!remember) {
      const raw = localStorage.getItem('fleetops.auth');
      if (raw) {
        sessionStorage.setItem('fleetops.auth', raw);
        localStorage.removeItem('fleetops.auth');
      }
    } else {
      const raw = sessionStorage.getItem('fleetops.auth');
      if (raw) {
        localStorage.setItem('fleetops.auth', raw);
        sessionStorage.removeItem('fleetops.auth');
      }
    }
  } catch {
    // Storage can be unavailable in private browsing — the session still works
    // for the current tab.
  }
}

export async function signIn({ email, password, remember }: SignInParams) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  await recordLoginAttempt(email, !error, data?.user?.id ?? null);

  if (error) {
    // Do not leak whether the address exists.
    throw new Error(
      error.message === 'Invalid login credentials'
        ? 'Email or password is incorrect.'
        : error.message,
    );
  }

  applyRememberPreference(remember);
  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  await supabase?.auth.signOut();
  try {
    sessionStorage.removeItem('fleetops.auth');
  } catch {
    /* ignore */
  }
}

export async function sendPasswordReset(email: string) {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.appUrl}/reset-password`,
  });
  if (error) throw new Error(error.message);
}

export async function updatePassword(password: string) {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function updateOwnProfile(patch: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>>) {
  const supabase = requireSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('You are not signed in.');

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}

/** Best-effort login audit. Never blocks or fails the sign-in flow. */
async function recordLoginAttempt(email: string, succeeded: boolean, userId: string | null) {
  if (!succeeded || !userId) return;
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('login_history').insert({
      user_id: userId,
      email,
      succeeded,
      user_agent: navigator.userAgent.slice(0, 400),
    });
  } catch {
    /* auditing must never break authentication */
  }
}

/** Marks the user as seen — powers "last active" in the admin panel. */
export async function touchLastSeen(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);
  } catch {
    /* non-critical */
  }
}
