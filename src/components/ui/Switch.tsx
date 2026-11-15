import * as RadixSwitch from '@radix-ui/react-switch';
import { useId } from 'react';

export function Switch({
  checked,
  onCheckedChange,
  label,
  hint,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-h-12 items-center justify-between gap-4">
      <label htmlFor={id} className="flex-1">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-ink-2 block text-sm">{hint}</span>}
      </label>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="bg-border-strong data-[state=checked]:bg-primary relative h-7 w-12 shrink-0 rounded-full transition-colors"
      >
        <RadixSwitch.Thumb className="bg-surface block size-5 translate-x-1 rounded-full shadow transition-transform data-[state=checked]:translate-x-6" />
      </RadixSwitch.Root>
    </div>
  );
}
