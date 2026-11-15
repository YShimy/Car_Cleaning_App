import { ChevronDown, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DayCapacityCard } from '@/components/app/DayCapacityCard';
import { PlanCard } from '@/components/app/PlanCard';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import { ADD_ON_ORDER, ADD_ONS, PLAN_ORDER } from '@/config/business';
import { WEEKDAY_LABEL } from '@/lib/dates';
import { formatEGP } from '@/lib/format';
import { nextServiceDate } from '@/lib/rules';
import { capacityByDay } from '@/lib/selectors';
import { useDemoStore } from '@/store/demoStore';
import type { AddOnId, Weekday } from '@/types/domain';
import { useOnboardingDraft } from './draft';
import { OnboardingFrame } from './OnboardingFrame';

export function PlanStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();
  return (
    <OnboardingFrame
      stepId="5"
      stepNumber={5}
      title="Choose your plan"
      backTo="/customer/onboarding/4b"
      primaryLabel={draft.plan ? 'Continue' : 'Choose a plan to continue'}
      primaryDisabled={!draft.plan}
      onPrimary={() => navigate('/customer/onboarding/6')}
    >
      <div className="space-y-4 pt-1" role="radiogroup" aria-label="Plans">
        {PLAN_ORDER.map((plan) => (
          <PlanCard
            key={plan}
            plan={plan}
            selected={draft.plan === plan}
            // Days depend on the plan (Premium uses both), so they are re-chosen.
            onSelect={(p) => update({ plan: p, days: [] })}
          />
        ))}
      </div>
      <p className="text-ink-2 text-center text-sm">
        Cancel anytime · Pause when you travel · No hidden fees
      </p>
    </OnboardingFrame>
  );
}

export function AddOnChecklist({
  value,
  onChange,
}: {
  value: AddOnId[];
  onChange: (v: AddOnId[]) => void;
}) {
  return (
    <ul className="divide-border divide-y">
      {ADD_ON_ORDER.map((id) => {
        const addOn = ADD_ONS[id];
        const checked = value.includes(id);
        return (
          <li key={id}>
            <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? value.filter((v) => v !== id) : [...value, id])}
                className="accent-primary size-5 shrink-0"
              />
              <span className="flex-1">
                <span className="block font-medium">{addOn.name}</span>
                <span className="text-ink-2 block text-sm">{addOn.description}</span>
              </span>
              <span className="tabular text-sm font-semibold">{formatEGP(addOn.price)}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export function DayStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();
  const compound = useDemoStore((s) => s.compounds.find((c) => c.id === draft.compoundId))!;
  const subscriptions = useDemoStore((s) => s.subscriptions);
  const [extrasOpen, setExtrasOpen] = useState(draft.addOns.length > 0);
  const now = new Date();
  const days = capacityByDay(compound, subscriptions);
  const premium = draft.plan === 'premium';
  const open = days.filter((d) => d.left > 0);
  const fullDay = days.find((d) => d.left <= 0);
  const premiumBlocked = premium && Boolean(fullDay);

  // Premium uses both days. With one open day there is nothing to choose.
  const autoDays: Weekday[] | null = premium
    ? premiumBlocked
      ? null
      : compound.serviceDays
    : open.length === 1
      ? [open[0].day]
      : null;
  const autoKey = autoDays?.join();
  useEffect(() => {
    if (autoDays && draft.days.join() !== autoKey) update({ days: autoDays });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autoKey captures autoDays
  }, [autoKey]);

  const joinWaitlist = (day: Weekday) =>
    toast.show(
      `You are on the ${WEEKDAY_LABEL[day]} waitlist`,
      'We will message you if a spot opens.',
    );

  return (
    <OnboardingFrame
      stepId="6"
      stepNumber={6}
      title={premium ? 'Your wash days' : 'Choose your wash day'}
      subtitle={`${compound.name} is served on ${WEEKDAY_LABEL[compound.serviceDays[0]]}s and ${WEEKDAY_LABEL[compound.serviceDays[1]]}s.`}
      backTo="/customer/onboarding/5"
      primaryLabel={draft.days.length ? 'Continue' : 'Choose a day to continue'}
      primaryDisabled={draft.days.length === 0}
      onPrimary={() => navigate('/customer/onboarding/7')}
    >
      {premium && !premiumBlocked && (
        <p className="bg-primary-soft text-primary rounded-card flex gap-2 px-3 py-2.5 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Premium includes both wash days, so both are selected for you.
        </p>
      )}
      {premiumBlocked && fullDay && (
        <div className="bg-danger-soft rounded-card space-y-2 px-3 py-3 text-sm" role="alert">
          <p className="text-danger font-medium">
            Premium needs both wash days, and {WEEKDAY_LABEL[fullDay.day]} is full.
          </p>
          <p>Choose Essential or Plus, or join the {WEEKDAY_LABEL[fullDay.day]} waitlist.</p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/customer/onboarding/5')}>
            Change plan
          </Button>
        </div>
      )}
      <div className="space-y-3">
        {days.map((d) => (
          <DayCapacityCard
            key={d.day}
            day={d.day}
            nextDate={nextServiceDate([d.day], now)}
            spotsLeft={d.left}
            selected={draft.days.includes(d.day)}
            locked={premium}
            onSelect={(day) => update({ days: [day] })}
            onJoinWaitlist={joinWaitlist}
          />
        ))}
      </div>

      <div className="rounded-card border-border bg-surface border">
        <button
          type="button"
          onClick={() => setExtrasOpen((o) => !o)}
          aria-expanded={extrasOpen}
          className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left"
        >
          <span>
            <span className="block font-medium">Add extras to your first wash</span>
            <span className="text-ink-2 block text-sm">
              {draft.addOns.length ? `${draft.addOns.length} selected` : 'Optional'}
            </span>
          </span>
          <ChevronDown
            className={`text-ink-2 size-5 transition-transform ${extrasOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {extrasOpen && (
          <div className="border-border border-t px-4">
            <AddOnChecklist value={draft.addOns} onChange={(addOns) => update({ addOns })} />
          </div>
        )}
      </div>
    </OnboardingFrame>
  );
}
