import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="text-ink-2 flex items-center justify-between gap-2 text-sm">
        <span>{label}</span>
        {Icon && <Icon className="size-4" aria-hidden />}
      </div>
      <p className="tabular text-2xl font-semibold">{value}</p>
      {hint && <p className="text-ink-2 text-xs">{hint}</p>}
    </Card>
  );
}
