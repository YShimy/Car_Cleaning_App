import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { StatusChip, type Tone } from '@/components/ui/StatusChip';

export function AdminPage({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">{title}</h1>
          {subtitle && <p className="text-ink-2 text-sm">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Chip({ def }: { def: { label: string; tone: Tone } }) {
  return <StatusChip tone={def.tone}>{def.label}</StatusChip>;
}

export function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-ink-2 flex items-center gap-1.5 text-sm">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-border-strong text-ink bg-surface rounded-btn min-h-10 border px-2 text-sm"
      >
        {children}
      </select>
    </label>
  );
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-primary font-medium underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

export function Breadcrumb({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="text-primary inline-flex min-h-10 items-center text-sm font-medium hover:underline"
    >
      ← {label}
    </Link>
  );
}
