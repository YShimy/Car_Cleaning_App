import { Check } from 'lucide-react';
import { PLANS } from '@/config/business';
import { cn } from '@/lib/cn';
import { formatEGP } from '@/lib/format';
import { pricePerWash } from '@/lib/rules';
import type { PlanId } from '@/types/domain';
import { PriceTag } from '../ui/PriceTag';

export function PlanCard({
  plan,
  selected,
  onSelect,
  price,
  name = 'plan',
}: {
  plan: PlanId;
  selected: boolean;
  onSelect: (plan: PlanId) => void;
  /** Override the list price, e.g. with the family discount applied. */
  price?: number;
  name?: string;
}) {
  const config = PLANS[plan];
  const discounted = price !== undefined && price < config.pricePerMonth;
  return (
    <label
      className={cn(
        'rounded-card bg-surface relative block cursor-pointer border-2 p-4 transition-colors',
        selected ? 'border-primary bg-primary-soft' : 'border-border',
      )}
    >
      <input
        type="radio"
        name={name}
        value={plan}
        checked={selected}
        onChange={() => onSelect(plan)}
        className="sr-only"
      />
      {config.popular && (
        <span className="bg-primary absolute -top-3 right-4 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white">
          Most popular
        </span>
      )}
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-lg font-semibold">{config.name}</span>
          <PriceTag
            amount={price ?? config.pricePerMonth}
            strikeAmount={discounted ? config.pricePerMonth : undefined}
            period="month"
            size="lg"
          />
        </span>
        <span
          aria-hidden
          className={cn(
            'mt-1 grid size-6 shrink-0 place-items-center rounded-full border-2',
            selected ? 'border-primary bg-primary text-white' : 'border-border-strong',
          )}
        >
          {selected && <Check className="size-4" strokeWidth={3} />}
        </span>
      </span>
      <ul className="mt-3 space-y-1.5">
        {config.inclusions.map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm">
            <Check className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
            {line}
          </li>
        ))}
      </ul>
      <span className="text-ink-2 mt-3 block text-xs">
        ≈ {formatEGP(pricePerWash(plan))} per wash
      </span>
    </label>
  );
}
