import { cn } from '@/lib/cn';

/** Initials only: the demo never shows real faces. */
export function Avatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = { sm: 'size-8 text-xs', md: 'size-11 text-sm', lg: 'size-16 text-xl' }[size];
  return (
    <span
      aria-hidden
      className={cn(
        'bg-primary-soft text-primary grid shrink-0 place-items-center rounded-full font-semibold',
        cls,
      )}
    >
      {initials}
    </span>
  );
}
