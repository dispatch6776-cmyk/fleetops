# FleetOps architecture

## Principles

1. **Feature-sliced.** Each business capability owns its queries, components and
   types under `src/features/<feature>/`. Cross-cutting primitives live in
   `src/components/ui` and `src/lib`.
2. **Server state ≠ client state.** TanStack Query owns everything that comes
   from Supabase (caching, retries, invalidation). Zustand holds only local UI
   state (theme, sidebar, active truck).
3. **Security in depth.** The permission matrix hides UI a role should not see;
   PostgreSQL RLS makes it impossible to read that data even with a crafted
   request. The browser only ever holds the anon key.
4. **Offline tolerant.** The PWA service worker caches the shell and recent API
   responses; queries use `networkMode: 'offlineFirst'` and mutations refuse to
   run while offline rather than silently failing.

## Rendering & routing

`createBrowserRouter` with route-level `React.lazy` splitting. The shell
(`AppShell`) renders the sidebar, topbar, breadcrumbs, command palette and an
animated `<Outlet />`. Every route is wrapped by an `ErrorBoundary` keyed on the
pathname so a crash in one module never blanks the app.

## Design system

Tokens are CSS custom properties in `src/styles/globals.css`, consumed through
Tailwind's theme extension (`tailwind.config.ts`). Light and dark are the same
token names with different values, so components never branch on theme. A blocking
inline script in `index.html` applies the stored preference before first paint to
eliminate the flash of the wrong theme.

Type scale, radii, elevation (`shadow-xs/soft/card/pop/glow`) and motion easing
(`ease-smooth`) are all centralised — components compose tokens, never raw hex.

## Data flow

```
Component → feature hook (useQuery/useMutation) → feature api module
          → supabase-js → PostgREST → Postgres (RLS enforced)
```

Query keys are centralised in `src/app/query-client.ts` so invalidation after a
mutation is explicit and typo-proof.

## Accessibility

Radix primitives provide focus management, roving tabindex and ARIA wiring.
A skip-link targets `#main`, focus rings are visible for keyboard users only,
and `prefers-reduced-motion` disables all animation.

## Performance budget

- Route-level code splitting plus manual vendor chunks (react, charts, calendar,
  supabase, motion, pdf).
- Fonts preconnected and `display=swap`.
- Immutable one-year caching for `/assets/*`, revalidate for `index.html`.
- Images and API responses cached by Workbox with sensible expirations.
