import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: ThemePreference;
  resolved: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  /** Recomputes the resolved theme from the OS preference. */
  syncSystem: () => void;
}

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(theme: ThemePreference): ResolvedTheme {
  return theme === 'system' ? systemTheme() : theme;
}

export function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? '#0B1220' : '#FFFFFF');
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolved: resolve('system'),
      setTheme: (theme) => {
        const resolved = resolve(theme);
        applyTheme(resolved);
        set({ theme, resolved });
      },
      toggleTheme: () => {
        const next: ThemePreference = get().resolved === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },
      syncSystem: () => {
        if (get().theme !== 'system') return;
        const resolved = systemTheme();
        applyTheme(resolved);
        set({ resolved });
      },
    }),
    {
      name: 'fleetops.theme',
      partialize: (state) => ({ theme: state.theme }) as ThemeState,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const resolved = resolve(state.theme);
        applyTheme(resolved);
        state.resolved = resolved;
      },
    },
  ),
);
