import { Banknote, CreditCard, Info, Landmark, Smartphone } from 'lucide-react';
import { RadioCard, TextField } from '@/components/ui/Field';
import type { PaymentMethod } from '@/types/domain';

const METHODS: {
  value: PaymentMethod;
  title: string;
  description?: string;
  icon: typeof CreditCard;
}[] = [
  { value: 'card', title: 'Card', icon: CreditCard },
  { value: 'wallet', title: 'Mobile wallet', icon: Smartphone },
  { value: 'instapay', title: 'InstaPay', icon: Landmark },
  {
    value: 'cash',
    title: 'Cash on first wash',
    description: 'Pay the washer in person.',
    icon: Banknote,
  },
];

export function DemoPaymentNote() {
  return (
    <p className="bg-warning-soft text-warning rounded-card flex items-start gap-2 px-3 py-2.5 text-sm font-medium">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      Demo — no payment is processed
    </p>
  );
}

/**
 * Payment method radios. The card fields are pre-filled and read-only so
 * nobody ever types real card details into the demo.
 */
export function PaymentMethodPicker({
  value,
  onChange,
  name = 'payment-method',
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  name?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 font-semibold">Payment method</legend>
      {METHODS.map(({ value: method, title, description, icon: Icon }) => (
        <RadioCard
          key={method}
          name={name}
          value={method}
          checked={value === method}
          onChange={(v) => onChange(v as PaymentMethod)}
          title={title}
          description={description}
          icon={<Icon className="text-ink-2 size-5" aria-hidden />}
        />
      ))}
      {value === 'card' && (
        <div className="rounded-card border-border bg-surface space-y-3 border p-3">
          <DemoPaymentNote />
          <TextField label="Card number" value="4242 4242 4242 4242" readOnly />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Expiry" value="12 / 29" readOnly />
            <TextField label="CVV" value="•••" readOnly />
          </div>
        </div>
      )}
      {value !== 'card' && <DemoPaymentNote />}
    </fieldset>
  );
}
