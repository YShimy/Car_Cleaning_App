import type { HTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/cn';

export function Card({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      className={cn('rounded-card border-border bg-surface shadow-card border p-4', className)}
      {...props}
    />
  );
}

export function SectionTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-ink text-lg font-semibold', className)} {...props} />;
}
