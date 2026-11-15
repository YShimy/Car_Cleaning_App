import { FlaskConical } from 'lucide-react';

/** Required on every admin and compound-manager screen (PLAN.md 2.6). */
export function DemoBadge() {
  return (
    <span className="bg-warning-soft text-warning inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap">
      <FlaskConical className="size-3.5" aria-hidden />
      Demo data — illustrative only
    </span>
  );
}
