import { addMonths } from 'date-fns';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CarIllustration } from '@/components/app/CarIllustration';
import { DayCapacityCard } from '@/components/app/DayCapacityCard';
import { PageHeader } from '@/components/app/PageHeader';
import { PaymentMethodPicker } from '@/components/app/PaymentMethodPicker';
import { PlanCard } from '@/components/app/PlanCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SelectField, TextField } from '@/components/ui/Field';
import { BottomSheet } from '@/components/ui/Sheet';
import { StatusChip } from '@/components/ui/StatusChip';
import { toast } from '@/components/ui/toast';
import { FAMILY_DISCOUNT, PLAN_ORDER, PLANS } from '@/config/business';
import { bodyTypeOf, CAR_COLOR_LABEL, CAR_MAKES, CAR_MODELS, carLabel } from '@/data/cars';
import { joinWeekdays, WEEKDAY_LABEL } from '@/lib/dates';
import { formatDateLong, formatDateNumeric, formatEGP, formatPercent } from '@/lib/format';
import { firstWashDate, nextServiceDate, planPriceForCar } from '@/lib/rules';
import { capacityByDay } from '@/lib/selectors';
import { useDemoStore } from '@/store/demoStore';
import { useCustomer } from '@/store/hooks';
import type { CarColor, PaymentMethod, PlanId, Weekday } from '@/types/domain';
import { ColorSwatches } from '../onboarding/StepsCar';
import { SummaryRow } from '../onboarding/StepReview';
import { attempt } from '../shared/attempt';

const DISCOUNT_LABEL = formatPercent(FAMILY_DISCOUNT);

function AddCarSheet({ onClose }: { onClose: () => void }) {
  const { customer, compound, subscriptions, primary } = useCustomer();
  const allSubs = useDemoStore((s) => s.subscriptions);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [touched, setTouched] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState<CarColor>('silver');
  const [zone, setZone] = useState('');
  const [spot, setSpot] = useState('');
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [day, setDay] = useState<Weekday | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(primary?.paymentMethod ?? 'card');

  const now = new Date();
  const carIndex = subscriptions.length;
  const days = capacityByDay(compound, allSubs);
  const premium = plan === 'premium';
  const premiumBlocked = premium && days.some((d) => d.left <= 0);
  const chosenDays: Weekday[] = premium ? compound.serviceDays : day ? [day] : [];
  const carValid = Boolean(make && model && zone && spot.trim());
  const price = plan ? planPriceForCar(plan, carIndex) : 0;

  const next = () => {
    if (step === 1) {
      if (carValid) setStep(2);
      else setTouched(true);
    } else if (step === 2) setStep(3);
  };

  const confirm = () => {
    if (!plan) return;
    const ok = attempt(() =>
      useDemoStore.getState().subscribe({
        customerId: customer.id,
        compoundId: compound.id,
        car: {
          make,
          model,
          year: now.getFullYear() - 2,
          color,
          plate: 'Not provided',
          bodyType: bodyTypeOf(make, model),
          parkingZone: zone,
          parkingSpot: /^\d+$/.test(spot.trim()) ? `Spot ${spot.trim()}` : spot.trim(),
        },
        plan,
        weeklyDays: chosenDays,
        paymentMethod: method,
      }),
    );
    if (ok) {
      toast.success(
        `${make} ${model} added`,
        `First wash on ${formatDateLong(firstWashDate(chosenDays, now))}.`,
      );
      onClose();
    }
  };

  return (
    <BottomSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={step === 1 ? 'Add another car' : step === 2 ? 'Choose its plan' : 'Review and pay'}
      description={`Step ${step} of 3 · ${DISCOUNT_LABEL} off this car’s plan`}
      footer={
        <>
          {step === 1 && (
            <Button block onClick={next}>
              Continue
            </Button>
          )}
          {step === 2 && (
            <Button
              block
              disabled={!plan || chosenDays.length === 0 || premiumBlocked}
              onClick={next}
            >
              {plan && chosenDays.length ? 'Continue' : 'Choose a plan and day'}
            </Button>
          )}
          {step === 3 && plan && (
            <Button block onClick={confirm}>
              Add car — {formatEGP(price)}/month
            </Button>
          )}
          {step > 1 && (
            <Button block variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2)}>
              Back
            </Button>
          )}
        </>
      }
    >
      {step === 1 && (
        <div className="space-y-4">
          <CarIllustration
            bodyType={bodyTypeOf(make, model)}
            color={color}
            state="clean"
            seed={9}
            className="rounded-card border-border aspect-[5/2] w-full border"
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Make"
              value={make}
              onChange={(e) => {
                setMake(e.target.value);
                setModel('');
              }}
              error={touched && !make ? 'Choose a make.' : undefined}
            >
              <option value="">Choose</option>
              {CAR_MAKES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </SelectField>
            <SelectField
              label="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!make}
              error={touched && make && !model ? 'Choose a model.' : undefined}
            >
              <option value="">{make ? 'Choose' : 'Make first'}</option>
              {CAR_MODELS.filter((m) => m.make === make).map((m) => (
                <option key={m.model}>{m.model}</option>
              ))}
            </SelectField>
          </div>
          <ColorSwatches value={color} onChange={setColor} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Parking zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              error={touched && !zone ? 'Choose a zone.' : undefined}
            >
              <option value="">Choose</option>
              {compound.parkingZones.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </SelectField>
            <TextField
              label="Spot number"
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
              inputMode="numeric"
              error={touched && !spot.trim() ? 'Enter the spot.' : undefined}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-4 pt-2">
            {PLAN_ORDER.map((p) => (
              <PlanCard
                key={p}
                plan={p}
                name="add-car-plan"
                selected={plan === p}
                price={planPriceForCar(p, carIndex)}
                onSelect={(chosen) => {
                  setPlan(chosen);
                  setDay(null);
                }}
              />
            ))}
          </div>
          {plan && (
            <fieldset className="space-y-3">
              <legend className="mb-2 font-semibold">{premium ? 'Wash days' : 'Wash day'}</legend>
              {premiumBlocked && (
                <p className="text-danger text-sm" role="alert">
                  Premium needs both wash days and one of them is full. Choose Essential or Plus.
                </p>
              )}
              {days.map((d) => (
                <DayCapacityCard
                  key={d.day}
                  day={d.day}
                  nextDate={nextServiceDate([d.day], now)}
                  spotsLeft={d.left}
                  selected={chosenDays.includes(d.day) && !premiumBlocked}
                  locked={premium}
                  onSelect={setDay}
                  onJoinWaitlist={(full) =>
                    toast.show(`You are on the ${WEEKDAY_LABEL[full]} waitlist`)
                  }
                />
              ))}
            </fieldset>
          )}
        </div>
      )}

      {step === 3 && plan && (
        <div className="space-y-4">
          <Card className="shadow-none">
            <dl className="divide-border divide-y">
              <SummaryRow label="Car">
                {CAR_COLOR_LABEL[color]} {make} {model}
                <span className="text-ink-2 block font-normal">
                  {zone}, spot {spot}
                </span>
              </SummaryRow>
              <SummaryRow label="Plan">{PLANS[plan].name}</SummaryRow>
              <SummaryRow label="Wash day">Every {joinWeekdays(chosenDays)}</SummaryRow>
              <SummaryRow label="First wash">
                {formatDateLong(firstWashDate(chosenDays, now))}
              </SummaryRow>
              <SummaryRow label="Family plan">
                <span className="text-success">
                  −{formatEGP(PLANS[plan].pricePerMonth - price)} ({DISCOUNT_LABEL} off)
                </span>
              </SummaryRow>
              <SummaryRow label="Monthly total">
                <span className="tabular text-base font-semibold">{formatEGP(price)}</span>
              </SummaryRow>
            </dl>
            <p className="text-ink-2 border-border border-t pt-3 text-sm">
              Renews on {formatDateNumeric(addMonths(now, 1))}. Cancel anytime.
            </p>
          </Card>
          <PaymentMethodPicker value={method} onChange={setMethod} name="add-car-payment" />
        </div>
      )}
    </BottomSheet>
  );
}

export function CarsPage() {
  const { cars, subscriptions } = useCustomer();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader title="My cars" backTo="/customer/account" />
      <ul className="space-y-3">
        {cars.map((car) => {
          const sub = subscriptions.find((s) => s.carId === car.id);
          return (
            <li key={car.id}>
              <Card className="overflow-hidden p-0">
                <CarIllustration
                  bodyType={car.bodyType}
                  color={car.color}
                  state="clean"
                  seed={car.year}
                  className="aspect-[5/2] w-full"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-lg font-semibold">
                      {carLabel(car)} <span className="text-ink-2 font-normal">{car.year}</span>
                    </p>
                    {sub ? (
                      <StatusChip tone={sub.status === 'active' ? 'success' : 'warning'}>
                        {PLANS[sub.plan].name}
                        {sub.status === 'paused' ? ' · paused' : ''}
                      </StatusChip>
                    ) : (
                      <StatusChip>No plan</StatusChip>
                    )}
                  </div>
                  <p className="text-ink-2 text-sm">
                    {CAR_COLOR_LABEL[car.color]} · Plate {car.plate}
                  </p>
                  <p className="text-ink-2 text-sm">
                    {car.parkingZone} · {car.parkingSpot}
                  </p>
                  {sub && (
                    <p className="mt-2 text-sm">
                      Every {joinWeekdays(sub.weeklyDays)} ·{' '}
                      <span className="tabular font-medium">
                        {formatEGP(sub.monthlyPrice)}/month
                      </span>
                    </p>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      <Button block onClick={() => setAdding(true)}>
        <Plus className="size-5" aria-hidden />
        Add another car — save {DISCOUNT_LABEL}
      </Button>
      {adding && <AddCarSheet onClose={() => setAdding(false)} />}
    </div>
  );
}
