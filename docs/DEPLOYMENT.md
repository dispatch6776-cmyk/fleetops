# Deploying FleetOps

FleetOps is a static single-page app (Netlify) backed by Supabase (Postgres,
Auth, Storage, Edge Functions) and the Google Maps JavaScript API. There is no
separate application server to run — Netlify serves the built frontend, and
the frontend talks directly to Supabase over PostgREST, protected by
Row-Level Security.

This guide sets up a fresh Supabase project end to end, then deploys the
frontend to Netlify. Budget about 20 minutes for a first deploy.

## 1. Create the Supabase project

1. [supabase.com](https://supabase.com) → *New project*. Pick a region close
   to where the fleet operates — Postgres latency shows up in every page load.
2. Save the generated database password somewhere safe; you won't need it
   again unless you connect with `psql` directly.
3. Once the project is provisioning, go to *Settings → API* and copy the
   **Project URL** and the **`anon` `public`** key. These become
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 2. Run the database migrations

The schema, RLS policies, triggers, reporting views and storage buckets are
all plain SQL in `supabase/migrations/`, applied in filename order (see the
table in [`docs/DATABASE.md`](DATABASE.md)). Two ways to run them:

**Supabase CLI (recommended — keeps migrations under version control):**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

**SQL editor (no CLI required):** open *SQL Editor* in the Supabase dashboard
and paste each file in `supabase/migrations/` in order, running each one
before moving to the next. Storage buckets and their access policies are
created by `0009_storage.sql` — there's no separate manual step in the
dashboard for buckets.

Once the migrations are applied, you can optionally seed 18 months of sample
fleet history (safe to skip for a real fleet — go straight to *Add truck* in
the app instead). Either paste `supabase/seed.sql` into the SQL Editor, or run
it with `psql` using the connection string from *Settings → Database*:

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

## 3. Configure authentication

Supabase Auth works out of the box with email/password, which is all FleetOps
uses. Two settings worth changing before inviting real users:

- **Site URL** (*Authentication → URL Configuration*): set to your Netlify
  domain (e.g. `https://your-fleet.netlify.app`). This is where password-reset
  links point.
- **Redirect URLs**: add `https://your-fleet.netlify.app/reset-password` so
  the emailed link is allowed to land there.

The **first account created becomes the Owner** automatically — that's the
`handle_new_user` trigger in `0006_functions_triggers.sql`. Every account
after that defaults to Viewer until an Owner or Administrator promotes them
from *Admin → Users*.

## 4. Deploy the Edge Functions

Two Deno functions live in `supabase/functions/`:

| Function | Purpose | Required secret |
| --- | --- | --- |
| `ai-assistant` | Answers questions in the AI Assistant page using Anthropic's API, scoped to the caller's own fleet data | `ANTHROPIC_API_KEY` |
| `daily-alerts` | Writes notification rows for anything expiring, due or overdue in the next 30 days | none beyond the service-role key Supabase provides automatically |

```bash
supabase functions deploy ai-assistant
supabase functions deploy daily-alerts
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

The AI Assistant page still works without this secret — it falls back to the
local statistical insights in `src/features/ai/insights.ts` (trend, forecast
and anomaly detection computed client-side, zero cost, no API key required).
Setting `ANTHROPIC_API_KEY` additionally enables free-form questions answered
by the model.

`daily-alerts` needs a scheduler to actually run daily. In the dashboard, go
to *Database → Extensions* and enable **`pg_cron`** and **`pg_net`** (not
enabled by the migrations, since they're account-level extensions toggled
through the dashboard rather than plain SQL). Then, in the SQL editor, run
the statement from the function's own header comment:

```sql
select cron.schedule(
  'fleetops-daily-alerts',
  '0 13 * * *', -- 1pm UTC daily; adjust to your fleet's timezone
  $$ select net.http_post(
       url := 'https://<project-ref>.functions.supabase.co/daily-alerts',
       headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
     ) $$
);
```

## 5. Google Maps

The Map module needs a browser API key with the **Maps JavaScript API** and
**Places API** enabled (Google Cloud Console → APIs & Services). Restrict the
key by HTTP referrer to your Netlify domain (and `localhost` for local dev)
so it can't be used from anywhere else if it leaks. This becomes
`VITE_GOOGLE_MAPS_API_KEY`. The rest of the app works without it — the Map
page shows a clear "not configured" state instead of failing.

## 6. Deploy the frontend to Netlify

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. Netlify → *Add new site → Import an existing project*, or use the deploy
   button in the README.
3. Build settings are already in `netlify.toml` (build command
   `npm run build`, publish directory `dist`) — Netlify picks them up
   automatically.
4. *Site configuration → Environment variables*, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_APP_URL` (your Netlify URL, e.g. `https://your-fleet.netlify.app`)
5. Deploy. `netlify.toml` also sets the Content-Security-Policy, HSTS and
   other security headers, SPA redirects for React Router, and long-lived
   caching for hashed assets — nothing else to configure.

The Supabase `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are **never**
set on Netlify — they're Supabase Edge Function secrets (step 4 above) and
never reach the browser bundle.

## 7. Post-deploy checklist

- [ ] Sign up the first account and confirm it lands as **Owner** (check
      *Admin → Users*).
- [ ] Create a second account, promote it to **Administrator**, and confirm
      it has identical access to the Owner.
- [ ] Create one account per remaining role (Maintenance Team, Mechanic,
      Viewer) and spot-check that each one *cannot* see financials, invoices
      or rent — the fastest way to catch an RLS regression is to try the app
      as the role that should be blocked, not the one that should get in.
- [ ] Add the truck, log a maintenance record and a fuel purchase, then
      confirm the dashboard KPIs and the Financials page agree with each
      other.
- [ ] Export a report to PDF, CSV and Excel from the Reports page.
- [ ] Trigger a password reset end to end (confirms the Site URL/Redirect URL
      configuration from step 3).
- [ ] If `ANTHROPIC_API_KEY` was set, ask the AI Assistant a question that
      needs the model (not just the local statistical insights).
- [ ] Confirm the PWA installs (desktop Chrome/Edge: address-bar install
      icon) and still shows the shell when offline.

## Troubleshooting

**Blank page after login, no errors in the UI.** Open devtools — this is
almost always a missing or mistyped `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
in Netlify's environment variables. The app renders a "Supabase is not
configured" screen when it can't find them at all; a *wrong* key instead
produces failed network requests.

**A role sees data it shouldn't.** That's a Row-Level Security bug, not a UI
bug — the permission matrix in `src/lib/permissions.ts` only controls what
renders, not what the database returns. Check the relevant policy in
`supabase/migrations/20260101000800_rls_policies.sql` before changing any
frontend code.

**Map page won't load / shows a referrer error.** The Google Maps key's HTTP
referrer restriction doesn't include your Netlify domain yet — add it in
Google Cloud Console, no redeploy needed (the key is read at runtime).
