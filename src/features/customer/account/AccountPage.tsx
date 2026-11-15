import { Bell, CarFront, ChevronRight, Pencil, Share2, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PaymentMethodPicker } from '@/components/app/PaymentMethodPicker';
import { PlanCard } from '@/components/app/PlanCard';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { RadioCard, TextField } from '@/components/ui/Field';
import { BottomSheet } from '@/components/ui/Sheet';
import { StatusChip, type Tone } from '@/components/ui/StatusChip';
import { toast } from '@/components/ui/toast';
import { PAYMENT_METHOD_LABEL, PLAN_ORDER, PLANS, REFERRAL_FREE_WEEKS } from '@/config/business';
import { BRAND } from '@/config/brand';
import { carLabel } from '@/data/cars';
import { joinWeekdays } from '@/lib/dates';
import { formatDateLong, formatDateNumeric, formatEGP } from '@/lib/format';
import { cancellationDate, nextBillingDate, planPriceForCar } from '@/lib/rules';
import { useDemoStore } from '@/store/demoStore';
import { useCustomer } from '@/store/hooks';
import type { Payment, PaymentMethod, PlanId, Subscription } from '@/types/domain';
import { SummaryRow } from '../onboarding/StepReview';
import { attempt } from '../shared/attempt';

const PAYMENT_TONE: Record<Payment['status'], Tone> = {
  paid: 'success',
  due: 'warning',
  overdue: 'danger',
  refunded: 'neutral',
};
const PAYMENT_LABEL: Record<Payment['status'], string> = {
  paid: 'Paid',
  due: 'Due',
  overdue: 'Overdue',
  refunded: 'Refunded',
};
const CANCEL_REASONS = ['Too expensive', 'Moving', 'Quality', 'Not using it', 'Other'];

function ProfileCard() {
  const { customer, compound } = useCustomer();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [unit, setUnit] = useState(customer.unit);

  const save = () => {
    if (!name.trim() || !unit.trim()) {
      toast.error('Name and home cannot be empty.');
      return;
    }
    useDemoStore
      .getState()
      .updateCustomer(customer.id, { name: name.trim(), phone: phone.trim(), unit: unit.trim() });
    setEditing(false);
    toast.success('Profile saved');
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle>Profile</SectionTitle>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden />
            Edit
          </Button>
        )}
      </div>
      {editing ? (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="Mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            hint="Demo: please do not enter a real number."
          />
          <TextField label="Home" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      ) : (
        <dl className="divide-border mt-1 divide-y">
          <SummaryRow label="Name">{customer.name}</SummaryRow>
          <SummaryRow label="Mobile">{customer.phone}</SummaryRow>
          <SummaryRow label="Compound">{compound.name}</SummaryRow>
          <SummaryRow label="Home">{customer.unit}</SummaryRow>
        </dl>
      )}
    </Card>
  );
}

function ChangePlanSheet({
  sub,
  carIndex,
  onClose,
}: {
  sub: Subscription;
  carIndex: number;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState<PlanId>(sub.plan);
  const price = planPriceForCar(plan, carIndex);
  const diff = price - sub.monthlyPrice;
  const renewal = formatDateNumeric(nextBillingDate(sub, new Date()));

  const change = () => {
    if (attempt(() => useDemoStore.getState().changePlan(sub.id, plan))) {
      toast.success(`Plan changed to ${PLANS[plan].name}`);
      onClose();
    }
  };

  return (
    <BottomSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title="Change plan"
      footer={
        <Button block disabled={plan === sub.plan} onClick={change}>
          {plan === sub.plan
            ? 'This is your current plan'
            : `Change to ${PLANS[plan].name} — ${formatEGP(price)}/month`}
        </Button>
      }
    >
      <div className="space-y-4 pt-2">
        {PLAN_ORDER.map((p) => (
          <PlanCard
            key={p}
            plan={p}
            name="change-plan"
            selected={plan === p}
            onSelect={setPlan}
            price={planPriceForCar(p, carIndex)}
          />
        ))}
        {plan !== sub.plan && (
          <p className="bg-bg rounded-card p-3 text-sm" aria-live="polite">
            Your washes change from tomorrow.{' '}
            {diff > 0
              ? `Until ${renewal} you pay only the difference for the days left (at most ${formatEGP(diff)}). From then it is ${formatEGP(price)} a month.`
              : `The lower price of ${formatEGP(price)} a month starts on ${renewal}. Nothing extra is charged.`}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}

function PaymentMethodSheet({ sub, onClose }: { sub: Subscription; onClose: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>(sub.paymentMethod);
  return (
    <BottomSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title="Payment method"
      footer={
        <Button
          block
          onClick={() => {
            useDemoStore.getState().setPaymentMethod(sub.id, method);
            toast.success('Payment method saved');
            onClose();
          }}
        >
          Save
        </Button>
      }
    >
      <PaymentMethodPicker value={method} onChange={setMethod} name="change-payment" />
    </BottomSheet>
  );
}

/** Two honest steps: why, then a clear confirmation with the end date. No dark patterns. */
function CancelSheet({ sub, onClose }: { sub: Subscription; onClose: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState('');
  const endDate = cancellationDate(sub, new Date());

  const cancel = () => {
    useDemoStore.getState().requestCancellation(sub.id, reason);
    toast.show('Subscription cancelled', `Your washes continue until ${formatDateLong(endDate)}.`);
    onClose();
  };

  return (
    <BottomSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={step === 1 ? 'Cancel subscription' : 'Confirm cancellation'}
      description={
        step === 1 ? 'Step 1 of 2 · Why are you leaving? It helps us improve.' : 'Step 2 of 2'
      }
      footer={
        step === 1 ? (
          <>
            <Button block disabled={!reason} onClick={() => setStep(2)}>
              Continue
            </Button>
            {sub.status === 'active' && (
              <Button
                block
                variant="secondary"
                onClick={() => {
                  onClose();
                  navigate('/customer/schedule');
                }}
              >
                Pause instead (1–4 weeks)
              </Button>
            )}
          </>
        ) : (
          <>
            <Button block variant="destructive" onClick={cancel}>
              Cancel my subscription
            </Button>
            <Button block variant="ghost" onClick={onClose}>
              Keep my subscription
            </Button>
          </>
        )
      }
    >
      {step === 1 ? (
        <fieldset className="space-y-2">
          <legend className="sr-only">Reason</legend>
          {CANCEL_REASONS.map((r) => (
            <RadioCard
              key={r}
              name="cancel-reason"
              value={r}
              checked={reason === r}
              onChange={setReason}
              title={r}
            />
          ))}
        </fieldset>
      ) : (
        <ul className="space-y-3">
          <li>
            Your subscription ends on{' '}
            <strong className="font-semibold">{formatDateLong(endDate)}</strong>, the end of the
            month you have paid for.
          </li>
          <li>Your washes continue as normal until then.</li>
          <li>You will not be charged again. There is no cancellation fee.</li>
          <li className="text-ink-2 text-sm">You can undo this any time before that date.</li>
        </ul>
      )}
    </BottomSheet>
  );
}

function LinkRow({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link to={to} className="flex min-h-14 items-center gap-3">
      <Icon className="text-ink-2 size-5" aria-hidden />
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight className="text-ink-2 size-5" aria-hidden />
    </Link>
  );
}

type SheetState = { kind: 'plan' | 'payment' | 'cancel'; subId: string } | null;

export function AccountPage() {
  const navigate = useNavigate();
  const { customer, cars, subscriptions } = useCustomer();
  const payments = useDemoStore((s) => s.payments);
  const customers = useDemoStore((s) => s.customers);
  const presentationMode = useDemoStore((s) => s.session.presentationMode);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const now = new Date();

  const myPayments = payments
    .filter((p) => p.customerId === customer.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const referrals = customers.filter((c) => c.referredBy === customer.id).length;
  const sheetSub = subscriptions.find((s) => s.id === sheet?.subId);

  const share = async () => {
    const text = `I get my car washed every week in my parking spot with ${BRAND.name}. Use my code ${customer.referralCode} and we both get ${REFERRAL_FREE_WEEKS} free week.`;
    try {
      if (navigator.share) await navigator.share({ title: BRAND.name, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success('Invitation copied', 'Paste it into WhatsApp or a message.');
      }
    } catch {
      // Share sheet dismissed, or clipboard blocked: show the code instead.
      toast.show(`Your code is ${customer.referralCode}`);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Account</h1>
      <ProfileCard />

      <section aria-labelledby="plan-title" className="space-y-3">
        <SectionTitle id="plan-title">Plan and billing</SectionTitle>
        {subscriptions.map((sub, index) => {
          const car = cars.find((c) => c.id === sub.carId);
          return (
            <Card key={sub.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{PLANS[sub.plan].name}</p>
                  <p className="text-ink-2 text-sm">
                    {car ? carLabel(car) : 'Car'} · every {joinWeekdays(sub.weeklyDays)}
                  </p>
                </div>
                <p className="tabular text-right font-semibold">
                  {formatEGP(sub.monthlyPrice)}
                  <span className="text-ink-2 block text-xs font-normal">per month</span>
                </p>
              </div>
              {sub.cancelAt ? (
                <div className="bg-warning-soft mt-3 rounded-lg p-3 text-sm">
                  <p>
                    Cancelled. Washes continue until{' '}
                    <strong className="font-semibold">{formatDateLong(sub.cancelAt)}</strong>.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      useDemoStore.getState().undoCancellation(sub.id);
                      toast.success('Welcome back', 'Your subscription continues as before.');
                    }}
                  >
                    Keep my subscription
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-ink-2 mt-2 text-sm">
                    {sub.status === 'paused'
                      ? `Paused until ${formatDateNumeric(sub.pausedUntil!)}. `
                      : ''}
                    Renews on {formatDateNumeric(nextBillingDate(sub, now))} ·{' '}
                    {PAYMENT_METHOD_LABEL[sub.paymentMethod]}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSheet({ kind: 'plan', subId: sub.id })}
                    >
                      Change plan
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSheet({ kind: 'payment', subId: sub.id })}
                    >
                      Payment method
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSheet({ kind: 'cancel', subId: sub.id })}
                    className="text-ink-2 mt-2 min-h-11 text-sm underline underline-offset-2"
                  >
                    Cancel subscription
                    {subscriptions.length > 1 && index >= 0 && car ? ` for ${carLabel(car)}` : ''}
                  </button>
                </>
              )}
            </Card>
          );
        })}
        {subscriptions.length === 0 && (
          <Card>
            <p className="text-ink-2">You have no active plan.</p>
          </Card>
        )}
      </section>

      <Card className="divide-border divide-y py-0">
        <LinkRow to="/customer/cars" icon={CarFront} label={`My cars (${cars.length})`} />
        <LinkRow to="/customer/addons" icon={Sparkles} label="Extras" />
        <LinkRow to="/customer/notifications" icon={Bell} label="Notifications" />
      </Card>

      <Card>
        <SectionTitle>Refer a neighbour</SectionTitle>
        <p className="text-ink-2 mt-1 text-sm">
          You both get {REFERRAL_FREE_WEEKS} free week when a neighbour subscribes with your code.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className="border-primary text-primary tabular flex min-h-12 flex-1 items-center justify-center rounded-lg border border-dashed font-semibold tracking-wider">
            {customer.referralCode}
          </span>
          <Button onClick={share}>
            <Share2 className="size-5" aria-hidden />
            Share
          </Button>
        </div>
        <p className="text-ink-2 mt-2 text-sm">
          {referrals === 0
            ? 'No neighbours have joined with your code yet.'
            : `${referrals} neighbour${referrals > 1 ? 's' : ''} joined with your code.`}
        </p>
      </Card>

      <Card>
        <SectionTitle className="mb-1">Payment history</SectionTitle>
        {myPayments.length === 0 ? (
          <p className="text-ink-2 text-sm">No payments yet.</p>
        ) : (
          <ul className="divide-border divide-y">
            {(showAllPayments ? myPayments : myPayments.slice(0, 3)).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.description}</span>
                  <span className="text-ink-2 text-xs">
                    {formatDateNumeric(p.date)} · {PAYMENT_METHOD_LABEL[p.method]}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="tabular text-sm font-semibold">{formatEGP(p.amount)}</span>
                  <StatusChip tone={PAYMENT_TONE[p.status]}>{PAYMENT_LABEL[p.status]}</StatusChip>
                </span>
              </li>
            ))}
          </ul>
        )}
        {myPayments.length > 3 && (
          <Button variant="ghost" size="sm" block onClick={() => setShowAllPayments((v) => !v)}>
            {showAllPayments ? 'Show fewer' : `Show all ${myPayments.length}`}
          </Button>
        )}
      </Card>

      {!presentationMode && (
        <button
          type="button"
          onClick={() => {
            useDemoStore.getState().setPersona(null);
            navigate('/customer/welcome');
          }}
          className="text-ink-2 min-h-11 w-full text-center text-sm underline underline-offset-2"
        >
          Demo: reset to new customer
        </button>
      )}

      {sheet?.kind === 'plan' && sheetSub && (
        <ChangePlanSheet
          sub={sheetSub}
          carIndex={subscriptions.indexOf(sheetSub)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'payment' && sheetSub && (
        <PaymentMethodSheet sub={sheetSub} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'cancel' && sheetSub && (
        <CancelSheet sub={sheetSub} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
