import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="bg-primary-soft text-primary grid size-12 place-items-center rounded-full">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="text-ink-2 max-w-xs">{title}</p>
      {action}
    </div>
  );
}
