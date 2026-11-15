import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface TimelineStep {
  title: string;
  detail?: string;
  state: 'done' | 'current' | 'upcoming';
}

/** Vertical status timeline. Replaces GPS tracking in this product. */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="relative flex gap-3 pb-5 last:pb-0"
          aria-current={step.state === 'current' ? 'step' : undefined}
        >
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn(
                'absolute top-6 left-[11px] h-[calc(100%-24px)] w-0.5',
                step.state === 'done' ? 'bg-success' : 'bg-border',
              )}
            />
          )}
          <span
            aria-hidden
            className={cn(
              'relative grid size-6 shrink-0 place-items-center rounded-full border-2',
              step.state === 'done' && 'border-success bg-success text-white',
              step.state === 'current' && 'border-info bg-info-soft',
              step.state === 'upcoming' && 'border-border-strong bg-surface',
            )}
          >
            {step.state === 'done' && <Check className="size-3.5" strokeWidth={3} />}
            {step.state === 'current' && (
              <span className="bg-info size-2 animate-pulse rounded-full" />
            )}
          </span>
          <div className="-mt-0.5">
            <p className={cn('font-medium', step.state === 'upcoming' && 'text-ink-2 font-normal')}>
              {step.title}
              <span className="sr-only">
                {step.state === 'done' ? ' (done)' : step.state === 'current' ? ' (now)' : ''}
              </span>
            </p>
            {step.detail && <p className="text-ink-2 text-sm">{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
