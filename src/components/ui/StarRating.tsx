import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

type Stars = 1 | 2 | 3 | 4 | 5;

export function StarRating({
  value,
  onChange,
  size = 'lg',
  label = 'Rating',
}: {
  value: number;
  onChange?: (stars: Stars) => void;
  size?: 'sm' | 'lg';
  label?: string;
}) {
  const stars = [1, 2, 3, 4, 5] as const;
  if (!onChange) {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={`${label}: ${value} out of 5`}
      >
        {stars.map((s) => (
          <Star
            key={s}
            aria-hidden
            className={cn(
              size === 'sm' ? 'size-4' : 'size-7',
              s <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-border-strong',
            )}
          />
        ))}
      </span>
    );
  }
  return (
    <div role="radiogroup" aria-label={label} className="flex justify-center gap-1">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          aria-label={`${s} star${s > 1 ? 's' : ''}`}
          onClick={() => onChange(s)}
          className="grid size-12 place-items-center rounded-full transition-transform active:scale-90"
        >
          <Star
            aria-hidden
            className={cn(
              'size-9 transition-colors',
              s <= value ? 'fill-amber-400 text-amber-400' : 'text-border-strong',
            )}
          />
        </button>
      ))}
    </div>
  );
}
