import { addMonths } from 'date-fns';
import { ShieldCheck, UserCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaymentMethodPicker } from '@/components/app/PaymentMethodPicker';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/toast';
import { ADD_ONS, PAYMENT_METHOD_LABEL, PLANS } from '@/config/business';
import { bodyTypeOf, CAR_COLOR_LABEL } from '@/data/cars';
import { joinWeekdays } from '@/lib/dates';
import { formatDateLong, formatDateNumeric, formatEGP, SERVICE_WINDOW_LABEL } from '@/lib/format';
import { firstWashDate, planPriceForCar } from '@/lib/rules';
import { endInterviewSession } from '@/lib/sessionRecorder';
import { useDemoStore } from '@/store/demoStore';
import { RuleError } from '@/store/reducers';
import { unitLabel, useOnboardingDraft } from './draft';
import { OnboardingFrame } from './OnboardingFrame';

export function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-ink-2 shrink-0 text-sm">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export function TrustStrip() {
  return (
    <ul className="space-y-2 text-sm">
      <li className="flex gap-2">
        <ShieldCheck className="text-success mt-0.5 size-5 shrink-0" aria-hidden />
        Damage protection: if anything happens during a wash, we cover it.
      </li>
      <li className="flex gap-2">
        <UserCheck className="text-success mt-0.5 size-5 shrink-0" aria-hidden />
        Washers are ID-verified and approved by your compound.
      </li>
    </ul>
  );
}

export function ReviewStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();
  const compound = useDemoStore((s) => s.compounds.find((c) => c.id === draft.compoundId))!;
  const [submitting, setSubmitting] = useState(false);
  const now = new Date();
  const plan = PLANS[draft.plan!];
  const monthly = planPriceForCar(plan.id, 0);
  const extras = draft.addOns.reduce((sum, id) => sum + ADD_ONS[id].price, 0);
  const firstWash = firstWashDate(draft.days, now);
  const cash = draft.paymentMethod === 'cash';

  const subscribe = () => {
    setSubmitting(true);
    // A short pause so the button's loading state is visible, as with a real payment.
    setTimeout(() => {
      try {
        useDemoStore.getState().subscribe({
          name: draft.name,
          phone: `+20 ${draft.phone}`,
          compoundId: compound.id,
          unit: unitLabel(draft),
          car: {
            make: draft.make,
            model: draft.model,
            year: draft.year,
            color: draft.color,
            plate: draft.plate.trim() || 'Not provided',
            bodyType: bodyTypeOf(draft.make, draft.model),
            parkingZone: draft.zone,
            parkingSpot: /^\d+$/.test(draft.spot.trim())
              ? `Spot ${draft.spot.trim()}`
              : draft.spot.trim(),
          },
          plan: plan.id,
          weeklyDays: draft.days,
          paymentMethod: draft.paymentMethod,
          firstWashAddOns: draft.addOns,
        });
        endInterviewSession('completed', {
          plan: plan.name,
          paymentMethod: PAYMENT_METHOD_LABEL[draft.paymentMethod],
          washDay: joinWeekdays(draft.days),
          compound: compound.name,
        });
        useDemoStore.getState().setInterviewMode(false);
        navigate('/customer/onboarding/done', { replace: true });
      } catch (error) {
        setSubmitting(false);
        if (error instanceof RuleError) {
          // Someone took the last spot while this customer was deciding.
          toast.error(error.message);
          update({ days: [] });
          navigate('/customer/onboarding/6');
        } else throw error;
      }
    }, 500);
  };

  return (
    <OnboardingFrame
      stepId="7"
      stepNumber={7}
      title="Review and pay"
      backTo="/customer/onboarding/6"
      primaryLabel={`Subscribe — ${formatEGP(monthly)}/month`}
      primaryLoading={submitting}
      onPrimary={subscribe}
    >
      <Card>
        <dl className="divide-border divide-y">
          <SummaryRow label="Compound">{compound.name}</SummaryRow>
          <SummaryRow label="Home">{unitLabel(draft)}</SummaryRow>
          <SummaryRow label="Car">
            {CAR_COLOR_LABEL[draft.color]} {draft.make} {draft.model} {draft.year}
            <span className="text-ink-2 block font-normal">
              {draft.zone}, spot {draft.spot}
            </span>
          </SummaryRow>
          <SummaryRow label="Plan">{plan.name}</SummaryRow>
          <SummaryRow label={draft.days.length > 1 ? 'Wash days' : 'Wash day'}>
            Every {joinWeekdays(draft.days)}
            <span className="text-ink-2 block font-normal">{SERVICE_WINDOW_LABEL}</span>
          </SummaryRow>
          <SummaryRow label="First wash">{formatDateLong(firstWash)}</SummaryRow>
          {draft.addOns.length > 0 && (
            <SummaryRow label="Extras (first wash)">
              {draft.addOns.map((id) => (
                <span key={id} className="block">
                  {ADD_ONS[id].name} · {formatEGP(ADD_ONS[id].price)}
                </span>
              ))}
            </SummaryRow>
          )}
          <SummaryRow label="Monthly total">
            <span className="tabular text-base font-semibold">{formatEGP(monthly)}</span>
          </SummaryRow>
          {extras > 0 && (
            <SummaryRow label={cash ? 'Due at first wash' : 'Billed today'}>
              <span className="tabular">{formatEGP(monthly + extras)}</span>
              <span className="text-ink-2 block font-normal">Plan + one-off extras</span>
            </SummaryRow>
          )}
        </dl>
        <p className="text-ink-2 border-border border-t pt-3 text-sm">
          {cash ? 'Pay at your first wash' : 'Billed today'}, renews on{' '}
          {formatDateNumeric(addMonths(now, 1))}. Cancel anytime.
        </p>
      </Card>

      <PaymentMethodPicker
        value={draft.paymentMethod}
        onChange={(paymentMethod) => update({ paymentMethod })}
      />

      <Card className="bg-success-soft border-success/20 shadow-none">
        <TrustStrip />
      </Card>
    </OnboardingFrame>
  );
}
