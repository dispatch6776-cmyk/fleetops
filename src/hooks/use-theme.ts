import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme.store';

/** Keeps the resolved theme in sync with the OS while preference is `system`. */
export function useThemeSync() {
  const syncSystem = useThemeStore((state) => state.syncSystem);

  useEffect(() => {
    const list = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => syncSystem();
    list.addEventListener('change', listener);
    syncSystem();
    return () => list.removeEventListener('change', listener);
  }, [syncSystem]);
}

export function useTheme() {
  const theme = useThemeStore((state) => state.theme);
  const resolved = useThemeStore((state) => state.resolved);
  const setTheme = useThemeStore((state) => state.setTheme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  return { theme, resolved, setTheme, toggleTheme };
}
