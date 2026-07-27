import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { useUIStore } from '@/stores/ui.store';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { titleForPath } from '@/app/navigation';
import { CommandPalette } from './command-palette';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppShell() {
  const location = useLocation();
  const mobileNavOpen = useUIStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen);
  const online = useOnlineStatus();

  useEffect(() => {
    document.title = `${titleForPath(location.pathname)} · FleetOps`;
  }, [location.pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh bg-background">
        <div className="sticky top-0 hidden h-dvh shrink-0 lg:block">
          <Sidebar />
        </div>

        <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DialogContent
            className="left-0 top-0 h-dvh w-[17rem] max-w-[85vw] translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-l-0 p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
          >
            <DialogTitle className="sr-only">Navigation</DialogTitle>
            <Sidebar variant="mobile" onNavigate={() => setMobileNavOpen(false)} />
          </DialogContent>
        </Dialog>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />

          {!online ? (
            <div
              role="status"
              className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-1.5 text-xs font-medium text-warning"
            >
              <WifiOff className="size-3.5" aria-hidden />
              You are offline — showing the last synced data. Changes will fail until you reconnect.
            </div>
          ) : null}

          <main id="main" className="flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8">
            <ErrorBoundary resetKey={location.pathname}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="mx-auto w-full max-w-[1400px]"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </main>
        </div>

        <CommandPalette />
      </div>
    </TooltipProvider>
  );
}
