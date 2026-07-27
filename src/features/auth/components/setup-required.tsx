import { Database, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Shown instead of the sign-in form when the Supabase environment variables are
 * missing, so a fresh clone explains itself rather than failing silently.
 */
export function SetupRequired() {
  return (
    <div className="space-y-4 rounded-xl border border-warning/40 bg-warning-soft/60 p-5">
      <div className="flex items-center gap-2 text-warning">
        <Database className="size-4" aria-hidden />
        <h2 className="text-sm font-semibold">Backend not configured</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        FleetOps needs a Supabase project before anyone can sign in. Add these two variables to
        <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-xs">.env.local</code>
        (or to your Netlify environment) and reload:
      </p>
      <pre className="overflow-x-auto rounded-lg bg-surface p-3 font-mono text-xs leading-relaxed">
        VITE_SUPABASE_URL=https://your-project.supabase.co{'\n'}
        VITE_SUPABASE_ANON_KEY=your-anon-key
      </pre>
      <p className="text-xs text-muted-foreground">
        Then run the migrations in <code className="font-mono">supabase/migrations</code> in order.
        The first account you create becomes the Owner.
      </p>
      <Button variant="outline" size="sm" asChild>
        <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer noopener">
          Open Supabase dashboard
          <ExternalLink />
        </a>
      </Button>
    </div>
  );
}
