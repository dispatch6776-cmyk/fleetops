import { useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { createQueryClient } from './query-client';
import { useAuthStore } from '@/features/auth/auth.store';
import { useThemeSync } from '@/hooks/use-theme';
import { useThemeStore } from '@/stores/theme.store';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const initialize = useAuthStore((state) => state.initialize);
  const resolved = useThemeStore((state) => state.resolved);

  useThemeSync();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 4200,
          className: '!rounded-lg !border !text-sm !shadow-pop',
          style: {
            background: resolved === 'dark' ? 'hsl(222 42% 11%)' : 'hsl(0 0% 100%)',
            color: resolved === 'dark' ? 'hsl(213 31% 95%)' : 'hsl(222 47% 11%)',
            borderColor: resolved === 'dark' ? 'hsl(222 24% 20%)' : 'hsl(220 18% 89%)',
          },
          success: { iconTheme: { primary: 'hsl(152 62% 42%)', secondary: '#fff' } },
          error: { iconTheme: { primary: 'hsl(0 72% 52%)', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
