import { Armchair, CalendarDays, Gift, Disc3, Sparkles, SprayCan } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { RadioCard } from '@/components/ui/Field';
import { PriceTag } from '@/components/ui/PriceTag';
import { BottomSheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/toast';
import { ADD_ON_ORDER, ADD_ONS, SKIP_CREDIT_ADD_ON } from '@/config/business';
import { WASH_TYPE_LABEL } from '@/config/copy';
import { carLabel } from '@/data/cars';
import { formatDateLong, formatDateShort, formatEGP } from '@/lib/format';
import { upcomingWashes } from '@/lib/selectors';
import { useDemoStore } from '@/store/demoStore';
import { useCustomer } from '@/store/hooks';
import type { AddOnId } from '@/types/domain';
import { attempt } from '../shared/attempt';

const ICONS: Record<AddOnId, LucideIcon> = {
  deep_interior: SprayCan,
  wax_polish: Sparkles,
  tire_shine: Disc3,
  seat_shampoo: Armchair,
};

export function AddOnsPage() {
  const { customer, cars } = useCustomer();
  const washes = useDemoStore((s) => s.washes);
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<AddOnId | null>(null);
  const upcoming = upcomingWashes(washes, customer.id, new Date()).slice(0, 4);
  const [washId, setWashId] = useState(params.get('wash') ?? upcoming[0]?.id ?? '');
  const targetWash = upcoming.find((w) => w.id === washId) ?? upcoming[0];
  const credits = customer.addOnCredits;

  const isFree = (id: AddOnId) => id === SKIP_CREDIT_ADD_ON && credits > 0;

  const confirm = () => {
    if (!selected || !targetWash) return;
    const name = ADD_ONS[selected].name;
    if (attempt(() => useDemoStore.getState().addAddOn(targetWash.id, selected))) {
      toast.success(
        `${name} added`,
        `For your wash on ${formatDateLong(targetWash.scheduledDate)}.`,
      );
      setSelected(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Extras" />
      <p className="text-ink-2 -mt-2">One-off extras, done during one of your scheduled washes.</p>

      {credits > 0 && (
        <p className="bg-success-soft text-success rounded-card flex items-center gap-2 px-3 py-2.5 text-sm font-medium">
          <Gift className="size-4 shrink-0" aria-hidden />
          You have {credits} free {ADD_ONS[SKIP_CREDIT_ADD_ON].name.toLowerCase()}
          {credits > 1 ? 's' : ''} from skipped washes.
        </p>
      )}

      {upcoming.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="Extras are added to an upcoming wash, and you have none scheduled."
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {ADD_ON_ORDER.map((id) => {
            const addOn = ADD_ONS[id];
            const Icon = ICONS[id];
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setSelected(id)}
                  className="h-full w-full text-left"
                >
                  <Card className="hover:border-primary flex h-full flex-col gap-2 transition-colors">
                    <span className="bg-primary-soft text-primary grid size-10 place-items-center rounded-xl">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="font-semibold">{addOn.name}</span>
                    <span className="text-ink-2 flex-1 text-sm">{addOn.description}</span>
                    {isFree(id) ? (
                      <span className="text-success font-semibold">
                        Free{' '}
                        <s className="text-ink-2 text-sm font-normal">{formatEGP(addOn.price)}</s>
                      </span>
                    ) : (
                      <PriceTag amount={addOn.price} size="sm" />
                    )}
                  </Card>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && targetWash && (
        <BottomSheet
          open
          onOpenChange={(open) => !open && setSelected(null)}
          title={ADD_ONS[selected].name}
          description={ADD_ONS[selected].description}
          footer={
            <Button block onClick={confirm} disabled={targetWash.addOns.includes(selected)}>
              {targetWash.addOns.includes(selected)
                ? 'Already on this wash'
                : isFree(selected)
                  ? 'Add for free'
                  : `Add for ${formatEGP(ADD_ONS[selected].price)}`}
            </Button>
          }
        >
          <fieldset className="space-y-2">
            <legend className="mb-2 font-semibold">Which wash?</legend>
            {upcoming.map((wash) => {
              const car = cars.find((c) => c.id === wash.carId);
              return (
                <RadioCard
                  key={wash.id}
                  name="addon-wash"
                  value={wash.id}
                  checked={targetWash.id === wash.id}
                  onChange={setWashId}
                  title={formatDateLong(wash.scheduledDate)}
                  description={`${WASH_TYPE_LABEL[wash.type]}${cars.length > 1 && car ? ` · ${carLabel(car)}` : ''}${wash.addOns.length ? ` · already has ${wash.addOns.map((a) => ADD_ONS[a].name).join(', ')}` : ''}`}
                />
              );
            })}
          </fieldset>
          <p className="text-ink-2 mt-3 text-sm">
            {isFree(selected)
              ? 'Uses one free credit. Nothing is charged.'
              : `Charged once to your payment method on ${formatDateShort(new Date())}. Demo — no payment is processed.`}
          </p>
        </BottomSheet>
      )}
    </div>
  );
}
