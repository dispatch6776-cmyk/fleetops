# FleetOps — Truck Rental & Fleet Management System

Production-grade SaaS application for owner-operators who rent a truck to another
company or driver. Tracks the asset, its compliance documents, maintenance and
repairs, mileage and fuel economy, rental income, operating expenses and profit —
with role-based access so your maintenance team never sees your money.

**Stack:** React 18 · TypeScript · Vite 6 · TailwindCSS · React Router 6 ·
TanStack Query · Zustand · React Hook Form + Zod · Framer Motion · Recharts ·
FullCalendar · Google Maps · pdf-lib · Supabase (Postgres, Auth, Storage, Edge
Functions) · Netlify.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR-ORG/YOUR-REPO)

Push this project to your own GitHub repository first, then replace
`YOUR-ORG/YOUR-REPO` in the badge URL above (or just use it — Netlify's
"Import an existing project" flow lets you pick the repo interactively either
way). See [Deploy to Netlify](#deploy-to-netlify) below for the full checklist,
including the one-time Supabase setup the app depends on.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in Supabase + Google Maps keys
npm run dev                    # http://localhost:5173
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript project check, no emit |
| `npm run lint` | ESLint (flat config, type-aware rules) |
| `npm run test` | Vitest unit tests (RBAC matrix, AI insights, formatters, `PermissionGate`) |
| `npm run test:watch` | Vitest in watch mode |

## Environment variables

Only `VITE_*` variables reach the browser. Service-role keys and AI provider keys
live in Supabase Edge Function secrets — never in the bundle.

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | ✅ | Project URL from Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Publishable key, protected by RLS |
| `VITE_GOOGLE_MAPS_API_KEY` | ✅ (Maps module) | Restrict by HTTP referrer |
| `VITE_APP_URL` | optional | Used for password-reset redirects |

## Project structure

```
src/
├─ app/                 Router, providers, query client, navigation model
├─ components/
│  ├─ ui/               Design-system primitives (button, dialog, table, …)
│  ├─ layout/           App shell, sidebar, topbar, command palette
│  ├─ common/           Page header, empty/error states, permission gate
│  └─ charts/           Recharts wrappers with themed tokens
├─ features/            Vertical slices: auth, dashboard, trucks, maintenance,
│                       mileage, financials, documents, map, calendar,
│                       reports, notifications, admin, ai
├─ hooks/               Reusable hooks (permissions, media query, shortcuts)
├─ lib/                 env, supabase client, permissions matrix, formatters
├─ pages/               Route entry points (lazy-loaded)
├─ stores/              Zustand stores (theme, UI state)
├─ styles/              Tailwind layer + design tokens
├─ test/                Vitest setup (jest-dom matchers, jsdom polyfills)
└─ types/               Domain and database types
supabase/
├─ migrations/          Versioned SQL: schema, indexes, triggers, RLS, seed
├─ functions/           Edge Functions (AI assistant, daily alert digest)
└─ seed.sql             18 months of sample fleet history
```

## Roles

| Role | Access |
| --- | --- |
| **Owner** | Everything, including financials and admin |
| **Administrator (Bob)** | Identical to Owner |
| **Maintenance Team** | Truck, maintenance, repairs, mileage, documents — no money |
| **Mechanic** | Maintenance module only |
| **Viewer** | Read-only, non-financial |

The matrix lives in `src/lib/permissions.ts` and is enforced again by Postgres
Row-Level Security policies in `supabase/migrations/`.

## Deploy to Netlify

1. Set up Supabase first (schema, storage buckets, Edge Function secrets) —
   see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full walkthrough.
2. Push this repository to GitHub.
3. Netlify → *Add new site* → *Import an existing project* (or use the
   deploy button above).
4. Build command `npm run build`, publish directory `dist` (already set in
   `netlify.toml`, along with SPA redirects, security headers and asset
   caching — nothing else to configure).
5. Add the environment variables from the table above under
   *Site configuration → Environment variables*, then deploy.
6. Sign up the first account in the running app — it automatically becomes
   the Owner (see `handle_new_user` in the database docs).

Full instructions, including Supabase project setup, the SQL migration order,
Edge Function deployment and a post-deploy verification checklist, are in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Project status

Every module in the original spec is built and verified: architecture, database
schema with RLS, authentication and RBAC, dashboard, financials, maintenance and
mileage, documents, maps, calendar, reports, notifications, the AI assistant,
global search, and the admin panel.

Verification performed against the real dependency tree (not stubs): `tsc -b`
project-wide typecheck, ESLint, a Vitest suite covering the RBAC permission
matrix, the AI insights engine, and component-level permission gating, and a
full `vite build` producing a code-split, PWA-enabled production bundle.
