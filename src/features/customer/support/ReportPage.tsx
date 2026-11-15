import { CheckCircle2, ImagePlus, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { buttonVariants } from '@/components/ui/Button';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RadioCard, SelectField, TextAreaField } from '@/components/ui/Field';
import { DAMAGE_CLAIM_WINDOW_HOURS } from '@/config/business';
import { ISSUE_TYPE_LABEL } from '@/config/copy';
import { cn } from '@/lib/cn';
import { formatDateShort } from '@/lib/format';
import { canReportDamage } from '@/lib/rules';
import { pastWashes } from '@/lib/selectors';
import { WASH_STATUS } from '@/components/app/WashStatusChip';
import { useDemoStore } from '@/store/demoStore';
import { useCustomer } from '@/store/hooks';
import type { IssueType } from '@/types/domain';

const TYPES: IssueType[] = ['quality', 'missed_wash', 'damage', 'billing', 'other'];

export function ReportPage() {
  const { customer } = useCustomer();
  const washes = useDemoStore((s) => s.washes);
  const [params] = useSearchParams();
  const recent = pastWashes(washes, customer.id).slice(0, 8);
  const [type, setType] = useState<IssueType>('quality');
  const [washId, setWashId] = useState(params.get('wash') ?? '');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(false);
  const [touched, setTouched] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const wash = washes.find((w) => w.id === washId);
  const damageTooLate = type === 'damage' && Boolean(wash) && !canReportDamage(wash!, new Date());
  const damageNeedsWash = type === 'damage' && !wash;
  const valid = description.trim().length >= 5 && !damageTooLate && !damageNeedsWash;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const id = useDemoStore.getState().reportIssue({
      customerId: customer.id,
      washId: wash?.id,
      type,
      description,
    });
    setReference(id.toUpperCase());
  };

  if (reference) {
    return (
      <div className="flex flex-col items-center pt-10 text-center">
        <span className="bg-success-soft text-success grid size-16 place-items-center rounded-full">
          <CheckCircle2 className="size-9" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl">We have your report</h1>
        <p className="text-ink-2 mt-2">
          We will reply within 24 hours, on WhatsApp and here in the app.
        </p>
        <Card className="mt-6 w-full">
          <p className="text-ink-2 text-sm">Reference number</p>
          <p className="tabular text-xl font-semibold tracking-wider">{reference}</p>
        </Card>
        <Link to="/customer/support" className={cn(buttonVariants({ block: true }), 'mt-6')}>
          Back to help
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <PageHeader title="Report a problem" />
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">What is it about?</legend>
        {TYPES.map((t) => (
          <RadioCard
            key={t}
            name="issue-type"
            value={t}
            checked={type === t}
            onChange={(v) => setType(v as IssueType)}
            title={ISSUE_TYPE_LABEL[t]}
          />
        ))}
      </fieldset>

      <SelectField
        label="Which wash? (optional)"
        value={washId}
        onChange={(e) => setWashId(e.target.value)}
        error={
          damageTooLate
            ? `Damage must be reported within ${DAMAGE_CLAIM_WINDOW_HOURS} hours of the wash, and this wash is older. Tap “Talk to a person” in chat and we will still look into it.`
            : touched && damageNeedsWash
              ? 'Choose the wash the damage happened in.'
              : undefined
        }
      >
        <option value="">Not about a specific wash</option>
        {recent.map((w) => (
          <option key={w.id} value={w.id}>
            {formatDateShort(w.scheduledDate)} · {WASH_STATUS[w.status].label}
          </option>
        ))}
      </SelectField>

      <TextAreaField
        label="What happened?"
        value={description}
        onChange={setDescription}
        placeholder="For example: the wheels were still dusty."
        error={
          touched && description.trim().length < 5
            ? 'Tell us what happened in a few words.'
            : undefined
        }
      />

      <div>
        <p className="mb-1.5 text-sm font-medium">Photo (optional)</p>
        {photo ? (
          <div className="border-border bg-surface flex items-center gap-3 rounded-lg border p-2">
            <span className="bg-border/70 text-ink-2 grid size-14 place-items-center rounded-md">
              <ImagePlus className="size-6" aria-hidden />
            </span>
            <span className="flex-1 text-sm">
              photo-1.jpg{' '}
              <span className="text-ink-2 block">Demo placeholder. Nothing is uploaded.</span>
            </span>
            <button
              type="button"
              onClick={() => setPhoto(false)}
              aria-label="Remove photo"
              className="hover:bg-bg grid size-11 place-items-center rounded-full"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setPhoto(true)}>
            <ImagePlus className="size-5" aria-hidden />
            Add a photo
          </Button>
        )}
      </div>

      <Button type="submit" block>
        Send report
      </Button>
    </form>
  );
}
