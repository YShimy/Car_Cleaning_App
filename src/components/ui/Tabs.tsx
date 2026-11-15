import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

/** Segmented control built on Radix Tabs. */
export function SegmentedTabs({
  tabs,
  defaultValue,
  label,
}: {
  tabs: { value: string; label: string; content: ReactNode }[];
  defaultValue?: string;
  label: string;
}) {
  return (
    <RadixTabs.Root defaultValue={defaultValue ?? tabs[0]?.value}>
      <RadixTabs.List
        aria-label={label}
        className="bg-border/60 grid auto-cols-fr grid-flow-col gap-1 rounded-xl p-1"
      >
        {tabs.map((t) => (
          <RadixTabs.Trigger
            key={t.value}
            value={t.value}
            className="text-ink-2 data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-card min-h-10 rounded-lg px-3 text-sm font-medium"
          >
            {t.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map((t) => (
        <RadixTabs.Content key={t.value} value={t.value} className="pt-4 outline-none">
          {t.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
