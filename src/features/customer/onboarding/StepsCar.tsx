import { Check } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarIllustration } from '@/components/app/CarIllustration';
import { SelectField, TextField } from '@/components/ui/Field';
import {
  bodyTypeOf,
  CAR_COLOR_HEX,
  CAR_COLOR_LABEL,
  CAR_COLORS,
  CAR_MAKES,
  CAR_MODELS,
} from '@/data/cars';
import { cn } from '@/lib/cn';
import { useDemoStore } from '@/store/demoStore';
import type { CarColor } from '@/types/domain';
import { useOnboardingDraft } from './draft';
import { OnboardingFrame } from './OnboardingFrame';

const YEARS = Array.from({ length: 16 }, (_, i) => new Date().getFullYear() + 1 - i);

export function ColorSwatches({
  value,
  onChange,
}: {
  value: CarColor;
  onChange: (c: CarColor) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">
        Colour: <span className="text-ink-2 font-normal">{CAR_COLOR_LABEL[value]}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {CAR_COLORS.map((color) => (
          <label key={color} className="relative cursor-pointer">
            <input
              type="radio"
              name="car-colour"
              value={color}
              checked={value === color}
              onChange={() => onChange(color)}
              className="peer sr-only"
              aria-label={CAR_COLOR_LABEL[color]}
            />
            <span
              className={cn(
                'border-border-strong peer-focus-visible:outline-primary grid size-11 place-items-center rounded-full border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
                value === color && 'ring-primary ring-2 ring-offset-2',
              )}
              style={{ backgroundColor: CAR_COLOR_HEX[color] }}
            >
              {value === color && (
                <Check
                  className={cn(
                    'size-5',
                    ['white', 'silver', 'beige'].includes(color) ? 'text-ink' : 'text-white',
                  )}
                  strokeWidth={3}
                  aria-hidden
                />
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CarStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();
  const [touched, setTouched] = useState(false);
  const models = CAR_MODELS.filter((m) => m.make === draft.make);
  const valid = Boolean(draft.make && draft.model);
  return (
    <OnboardingFrame
      stepId="4"
      stepNumber={4}
      title="Your car"
      backTo="/customer/onboarding/3b"
      primaryLabel="Continue"
      onPrimary={() => (valid ? navigate('/customer/onboarding/4b') : setTouched(true))}
    >
      <CarIllustration
        bodyType={bodyTypeOf(draft.make, draft.model)}
        color={draft.color}
        state="clean"
        seed={5}
        className="rounded-card border-border aspect-[5/3] w-full border"
        title={`Preview: ${CAR_COLOR_LABEL[draft.color]} ${draft.make} ${draft.model}`.trim()}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Make"
          value={draft.make}
          onChange={(e) => update({ make: e.target.value, model: '' })}
          error={touched && !draft.make ? 'Choose a make.' : undefined}
        >
          <option value="">Choose</option>
          {CAR_MAKES.map((make) => (
            <option key={make}>{make}</option>
          ))}
        </SelectField>
        <SelectField
          label="Model"
          value={draft.model}
          onChange={(e) => update({ model: e.target.value })}
          disabled={!draft.make}
          error={touched && draft.make && !draft.model ? 'Choose a model.' : undefined}
        >
          <option value="">{draft.make ? 'Choose' : 'Make first'}</option>
          {models.map((m) => (
            <option key={m.model}>{m.model}</option>
          ))}
        </SelectField>
      </div>
      <SelectField
        label="Year"
        value={draft.year}
        onChange={(e) => update({ year: Number(e.target.value) })}
      >
        {YEARS.map((y) => (
          <option key={y}>{y}</option>
        ))}
      </SelectField>
      <ColorSwatches value={draft.color} onChange={(color) => update({ color })} />
    </OnboardingFrame>
  );
}

export function ParkingStep() {
  const navigate = useNavigate();
  const { draft, update } = useOnboardingDraft();
  const compound = useDemoStore((s) => s.compounds.find((c) => c.id === draft.compoundId));
  const [touched, setTouched] = useState(false);
  const valid = Boolean(draft.zone && draft.spot.trim());
  return (
    <OnboardingFrame
      stepId="4b"
      stepNumber={4}
      title="Where is it parked?"
      subtitle="So the washer can find your car without calling you."
      backTo="/customer/onboarding/4"
      primaryLabel="Continue"
      onPrimary={() => (valid ? navigate('/customer/onboarding/5') : setTouched(true))}
    >
      <SelectField
        label="Parking zone"
        value={draft.zone}
        onChange={(e) => update({ zone: e.target.value })}
        error={touched && !draft.zone ? 'Choose your parking zone.' : undefined}
      >
        <option value="">Choose</option>
        {compound?.parkingZones.map((zone) => (
          <option key={zone}>{zone}</option>
        ))}
      </SelectField>
      <TextField
        label="Parking spot number"
        value={draft.spot}
        onChange={(e) => update({ spot: e.target.value })}
        inputMode="numeric"
        autoComplete="off"
        error={touched && !draft.spot.trim() ? 'Enter your parking spot number.' : undefined}
      />
      <TextField
        label="Plate number (optional)"
        value={draft.plate}
        onChange={(e) => update({ plate: e.target.value })}
        autoComplete="off"
        hint="Helps the washer confirm it is the right car."
      />
    </OnboardingFrame>
  );
}
