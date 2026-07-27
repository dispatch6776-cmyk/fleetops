import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Moon, Search, SearchX, Sun, LogOut } from 'lucide-react';
import { NAVIGATION } from '@/app/navigation';
import { useAuthStore } from '@/features/auth/auth.store';
import { SEARCH_ENTITY_ICONS, SEARCH_ENTITY_LABELS } from '@/features/search/constants';
import { useGlobalSearch } from '@/features/search/hooks';
import { useActiveTruck } from '@/features/trucks/hooks';
import { usePermissions } from '@/hooks/use-permissions';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import { useTheme } from '@/hooks/use-theme';
import { useUIStore } from '@/stores/ui.store';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

export function CommandPalette() {
  const navigate = useNavigate();
  const open = useUIStore((state) => state.commandPaletteOpen);
  const setOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const { can } = usePermissions();
  const { resolved, setTheme } = useTheme();
  const signOut = useAuthStore((state) => state.signOut);
  const { truckId } = useActiveTruck();
  const [query, setQuery] = useState('');

  // Reset the query every time the palette is reopened so it never shows
  // stale results from a previous search.
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const recordResults = useGlobalSearch(query, truckId, 4);
  const records = recordResults.data ?? [];

  useKeyboardShortcut({ key: 'k', meta: true, allowInInput: true }, (event) => {
    event.preventDefault();
    setOpen(!open);
  });

  const groups = useMemo(
    () =>
      NAVIGATION.map((group) => ({
        ...group,
        items: group.items.filter((item) => can(item.permission)),
      })).filter((group) => group.items.length > 0),
    [can],
  );

  // `g` then a letter jumps to a section (Linear-style).
  useEffect(() => {
    let awaitingSecondKey = false;
    let timer: ReturnType<typeof setTimeout>;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (awaitingSecondKey) {
        const match = groups
          .flatMap((group) => group.items)
          .find((item) => item.shortcut === event.key.toLowerCase());
        awaitingSecondKey = false;
        if (match) {
          event.preventDefault();
          navigate(match.href);
        }
        return;
      }

      if (event.key.toLowerCase() === 'g') {
        awaitingSecondKey = true;
        clearTimeout(timer);
        timer = setTimeout(() => {
          awaitingSecondKey = false;
        }, 1200);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
    };
  }, [groups, navigate]);

  function run(action: () => void) {
    setOpen(false);
    // Defer so the dialog can close before navigation animations start.
    requestAnimationFrame(action);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0" size="lg">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search pages and run actions with the keyboard.
        </DialogDescription>
        <Command
          loop
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages, actions, records…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {groups.map((group) => (
              <Command.Group key={group.label} heading={group.label}>
                {group.items.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={`${item.label} ${item.description ?? ''}`}
                    onSelect={() => run(() => navigate(item.href))}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-secondary"
                  >
                    <item.icon className="size-4 text-muted-foreground" aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.shortcut ? (
                      <kbd className="font-mono text-[10px] text-muted-foreground">
                        g {item.shortcut}
                      </kbd>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}

            {query.trim().length >= 2 && records.length > 0 ? (
              <Command.Group heading="Records">
                {records.map((row) => {
                  const Icon = SEARCH_ENTITY_ICONS[row.entity_type];
                  return (
                    <Command.Item
                      key={`${row.entity_type}-${row.entity_id}`}
                      value={`${row.title} ${row.subtitle ?? ''} record`}
                      onSelect={() => run(() => navigate(row.href))}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-secondary"
                    >
                      <Icon className="size-4 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{row.title}</p>
                        {row.subtitle ? (
                          <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>
                        ) : null}
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {SEARCH_ENTITY_LABELS[row.entity_type]}
                      </span>
                    </Command.Item>
                  );
                })}
                <Command.Item
                  value={`view all results for ${query} search`}
                  onSelect={() => run(() => navigate(`/search?q=${encodeURIComponent(query)}`))}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-primary aria-selected:bg-secondary"
                >
                  <SearchX className="size-4" aria-hidden />
                  View all results for “{query}”
                </Command.Item>
              </Command.Group>
            ) : null}

            <Command.Group heading="Actions">
              <Command.Item
                value="open full search page truck invoice repair maintenance mileage document shop"
                onSelect={() => run(() => navigate('/search'))}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-secondary"
              >
                <Search className="size-4 text-muted-foreground" aria-hidden />
                Open full search
              </Command.Item>
              <Command.Item
                value="toggle theme dark light appearance"
                onSelect={() => run(() => setTheme(resolved === 'dark' ? 'light' : 'dark'))}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-secondary"
              >
                {resolved === 'dark' ? (
                  <Sun className="size-4 text-muted-foreground" aria-hidden />
                ) : (
                  <Moon className="size-4 text-muted-foreground" aria-hidden />
                )}
                Switch to {resolved === 'dark' ? 'light' : 'dark'} mode
              </Command.Item>
              <Command.Item
                value="sign out log out"
                onSelect={() => run(() => void signOut().then(() => navigate('/login')))}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-danger aria-selected:bg-danger-soft"
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
