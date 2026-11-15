import { cn } from '@/lib/cn';
import { formatEGP } from '@/lib/format';

export function PriceTag({
  amount,
  period,
  size = 'md',
  strikeAmount,
  className,
}: {
  amount: number;
  period?: string;
  size?: 'sm' | 'md' | 'lg';
  strikeAmount?: number;
  className?: string;
}) {
  const sizes = { sm: 'text-base', md: 'text-xl', lg: 'text-3xl' } as const;
  return (
    <span className={cn('tabular inline-flex items-baseline gap-1', className)}>
      {strikeAmount !== undefined && (
        <s className="text-ink-2 text-sm font-normal">{formatEGP(strikeAmount)}</s>
      )}
      <span className={cn('font-semibold', sizes[size])}>{formatEGP(amount)}</span>
      {period && <span className="text-ink-2 text-sm">/ {period}</span>}
    </span>
  );
}
