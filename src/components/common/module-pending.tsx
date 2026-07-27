import { Rocket } from 'lucide-react';
import { EmptyState } from './empty-state';
import { PageHeader } from './page-header';

/**
 * Rendered by routes whose feature module is delivered in a later phase of the
 * build plan. Replaced wholesale as each phase lands — never shipped to
 * production with modules still pending.
 */
export function ModulePending({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Rocket}
        title={`${title} ships in ${phase}`}
        description="The route, permissions, navigation and layout for this module are already wired. The feature implementation lands in the phase noted above."
      />
    </div>
  );
}
