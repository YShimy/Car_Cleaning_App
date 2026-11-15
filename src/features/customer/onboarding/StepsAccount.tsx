import { Building2, CalendarDays, Check, MapPin } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '@/components/ui/Field';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { joinWeekdays } from '@/lib/dates';
import { useDemoStore } from '@/store/demoStore';
import { useOnboardingDraft } from './draft';
import { OnboardingFrame } from './OnboardingFrame';

const DEMO_CODE = '1234';

export function PhoneStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();
  const digits = draft.phone.replace(/\D/g, '');
  const valid = digits.length === 10 && digits.startsWith('1');
  return (
    <OnboardingFrame
      stepId="2"
      stepNumber={2}
      title="What is your mobile number?"
      subtitle="We will text you a code to confirm it."
      backTo="/customer/welcome"
      primaryLabel="Send code"
      primaryDisabled={!valid}
      onPrimary={() => navigate('/customer/onboarding/2b')}
    >
      <TextField
        label="Mobile number"
        prefix="+20"
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        value={draft.phone}
        onChange={(e) => update({ phone: e.target.value, otpVerified: false })}
        hint="Demo number is filled in for you. No message is sent."
        error={
          !valid && digits.length > 0
            ? 'Enter a 10-digit mobile number, for example 10 0000 0123.'
            : undefined
        }
      />
    </OnboardingFrame>
  );
}

export function OtpStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();
  const [code, setCode] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const finish = (digits: string[]) => {
    if (digits.join('') === DEMO_CODE) {
      update({ otpVerified: true });
      navigate('/customer/onboarding/3');
    } else {
      setError(true);
      setCode(['', '', '', '']);
      boxes.current[0]?.focus();
    }
  };

  const setDigits = (index: number, value: string) => {
    const typed = value.replace(/\D/g, '');
    if (!typed) {
      setCode((c) => c.map((d, i) => (i === index ? '' : d)));
      return;
    }
    // Handles typing one digit as well as pasting the whole code.
    const next = [...code];
    typed
      .split('')
      .slice(0, 4 - index)
      .forEach((d, i) => (next[index + i] = d));
    setCode(next);
    setError(false);
    const filled = next.findIndex((d) => d === '');
    if (filled === -1) finish(next);
    else boxes.current[filled]?.focus();
  };

  return (
    <OnboardingFrame
      stepId="2b"
      stepNumber={2}
      title="Enter the 4-digit code"
      subtitle={`Sent to +20 ${draft.phone}`}
      backTo="/customer/onboarding/2"
    >
      <div className="flex justify-center gap-3" role="group" aria-label="Verification code">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            value={digit}
            onChange={(e) => setDigits(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digit && i > 0) boxes.current[i - 1]?.focus();
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            autoFocus={i === 0}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={error || undefined}
            className={cn(
              'bg-surface tabular size-16 rounded-xl border-2 text-center text-2xl font-semibold',
              error ? 'border-danger' : 'border-border-strong focus:border-primary',
            )}
          />
        ))}
      </div>
      {error && (
        <p className="text-danger text-center text-sm" role="alert">
          That code is not right. The demo code is {DEMO_CODE}.
        </p>
      )}
      <p className="bg-primary-soft text-primary rounded-card px-4 py-3 text-center font-medium">
        Demo code: {DEMO_CODE}
      </p>
    </OnboardingFrame>
  );
}

export function CompoundStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();
  const compounds = useDemoStore((s) => s.compounds);
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return compounds.filter((c) => !q || `${c.name} ${c.area}`.toLowerCase().includes(q));
  }, [compounds, query]);
  const selected = compounds.find((c) => c.id === draft.compoundId);

  return (
    <OnboardingFrame
      stepId="3"
      stepNumber={3}
      title="Where do you live?"
      subtitle="We wash cars inside these compounds."
      backTo="/customer/onboarding/2"
      primaryLabel="Continue"
      primaryDisabled={!selected}
      onPrimary={() => navigate('/customer/onboarding/3b')}
      footerNote={
        selected && (
          <div
            className="bg-success-soft text-success rounded-card flex items-start gap-2 px-3 py-2.5 text-sm"
            role="status"
          >
            <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold">{selected.name}</strong> · Wash days:{' '}
              {joinWeekdays(selected.serviceDays)}
            </span>
          </div>
        )
      }
    >
      <TextField
        label="Search your compound"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Compound name or area"
      />
      <ul className="space-y-2" aria-label="Compounds">
        {matches.map((c) => {
          const comingSoon = c.status === 'onboarding';
          const isSelected = c.id === draft.compoundId;
          return (
            <li key={c.id}>
              <button
                type="button"
                aria-pressed={comingSoon ? undefined : isSelected}
                onClick={() => {
                  if (comingSoon) {
                    toast.show(
                      `You are on the ${c.name} waitlist`,
                      'We will message you when washes start there.',
                    );
                    return;
                  }
                  // A different compound has different zones and wash days.
                  update(isSelected ? {} : { compoundId: c.id, zone: '', days: [] });
                }}
                className={cn(
                  'rounded-card bg-surface flex min-h-16 w-full items-center gap-3 border-2 px-4 py-3 text-left',
                  isSelected ? 'border-primary bg-primary-soft' : 'border-border',
                )}
              >
                <Building2 className="text-ink-2 size-5 shrink-0" aria-hidden />
                <span className="flex-1">
                  <span className="block font-medium">{c.name}</span>
                  <span className="text-ink-2 flex items-center gap-1 text-sm">
                    <MapPin className="size-3.5" aria-hidden />
                    {c.area}
                  </span>
                </span>
                {comingSoon ? (
                  <span className="text-primary text-right text-xs font-semibold">
                    Coming soon —<br />
                    join waitlist
                  </span>
                ) : (
                  isSelected && (
                    <Check className="text-primary size-5" strokeWidth={3} aria-hidden />
                  )
                )}
              </button>
            </li>
          );
        })}
        {matches.length === 0 && (
          <li className="text-ink-2 py-6 text-center">
            No compound matches “{query}”. Check the spelling.
          </li>
        )}
      </ul>
    </OnboardingFrame>
  );
}

export function UnitStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();
  const compound = useDemoStore((s) => s.compounds.find((c) => c.id === draft.compoundId));
  const [touched, setTouched] = useState(false);
  const valid = draft.name.trim().length > 0 && draft.building.trim().length > 0;
  return (
    <OnboardingFrame
      stepId="3b"
      stepNumber={3}
      title="Your home"
      subtitle={compound?.name}
      backTo="/customer/onboarding/3"
      primaryLabel="Continue"
      onPrimary={() => (valid ? navigate('/customer/onboarding/4') : setTouched(true))}
    >
      <TextField
        label="First name"
        value={draft.name}
        onChange={(e) => update({ name: e.target.value })}
        autoComplete="off"
        error={touched && !draft.name.trim() ? 'Enter your first name.' : undefined}
      />
      <TextField
        label="Building or villa number"
        value={draft.building}
        onChange={(e) => update({ building: e.target.value })}
        inputMode="numeric"
        autoComplete="off"
        error={
          touched && !draft.building.trim() ? 'Enter your building or villa number.' : undefined
        }
      />
      <TextField
        label="Apartment (optional)"
        value={draft.apartment}
        onChange={(e) => update({ apartment: e.target.value })}
        inputMode="numeric"
        autoComplete="off"
        hint="Leave empty if you live in a villa."
      />
    </OnboardingFrame>
  );
}
