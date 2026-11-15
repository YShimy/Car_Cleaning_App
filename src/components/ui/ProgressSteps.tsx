export function ProgressSteps({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div>
      <p className="text-ink-2 mb-1.5 text-xs font-medium">
        Step {current} of {total}
      </p>
      <div
        className="bg-border h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={`Step ${current} of ${total}`}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  tone = 'primary',
  label,
}: {
  value: number;
  max: number;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  label: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-amber-500',
    danger: 'bg-danger',
  }[tone];
  return (
    <div
      className="bg-border h-2 overflow-hidden rounded-full"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className={`${bar} h-full rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}
