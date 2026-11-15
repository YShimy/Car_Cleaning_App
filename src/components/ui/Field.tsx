import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const controlClass =
  'border-border-strong bg-surface text-ink placeholder:text-ink-2/70 min-h-12 w-full rounded-btn border px-3 text-base read-only:bg-bg read-only:text-ink-2 disabled:bg-bg';

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-danger mt-1 text-sm" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-ink-2 mt-1 text-sm">{hint}</p>
      )}
    </div>
  );
}

interface CommonProps {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({
  label,
  hint,
  error,
  className,
  prefix,
  ...props
}: CommonProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & { prefix?: string }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        {prefix && (
          <span className="text-ink-2 tabular pointer-events-none absolute inset-y-0 left-3 flex items-center">
            {prefix}
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          className={cn(controlClass, prefix && 'pl-14', className)}
          {...props}
        />
      </div>
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select id={id} className={cn(controlClass, 'pr-8', className)} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  value,
  onChange,
  rows = 4,
  placeholder,
}: CommonProps & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass, 'py-3')}
      />
    </FieldShell>
  );
}

/** Large tappable radio row used for payment methods, reasons, etc. */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <label
      className={cn(
        'rounded-card flex min-h-14 cursor-pointer items-center gap-3 border px-4 py-3 transition-colors',
        checked ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="accent-primary size-5 shrink-0"
      />
      {icon}
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        {description && <span className="text-ink-2 block text-sm">{description}</span>}
      </span>
    </label>
  );
}
