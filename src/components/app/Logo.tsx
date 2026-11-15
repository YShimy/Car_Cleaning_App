import { Droplet } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { BRAND } from '@/config/brand';
import { cn } from '@/lib/cn';

export function Logo({
  size = 'md',
  className,
  ...props
}: { size?: 'sm' | 'md' | 'lg' } & HTMLAttributes<HTMLSpanElement>) {
  const box = { sm: 'size-7', md: 'size-8', lg: 'size-11' }[size];
  const text = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl' }[size];
  return (
    <span className={cn('inline-flex items-center gap-2 select-none', className)} {...props}>
      <span className={cn('bg-primary grid place-items-center rounded-lg text-white', box)}>
        <Droplet className="size-[58%]" fill="currentColor" aria-hidden />
      </span>
      <span className={cn('font-semibold tracking-tight', text)}>{BRAND.name}</span>
    </span>
  );
}
