import { Camera, Check, CheckCircle2, CircleAlert, MapPin, SearchX, X } from 'lucide-react';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CarIllustration } from '@/components/app/CarIllustration';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/Field';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { BottomSheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/toast';
import { ADD_ONS } from '@/config/business';
import { WASH_TYPE_LABEL } from '@/config/copy';
import { CAR_COLOR_LABEL, carLabel } from '@/data/cars';
import { cn } from '@/lib/cn';
import { toISODate } from '@/lib/dates';
import { CHECKLIST_LABEL, requiredChecklist } from '@/lib/rules';
import { useDemoStore } from '@/store/demoStore';
import type { WashFlag } from '@/store/reducers';
import type { Car, DamageMarker, Wash } from '@/types/domain';

const TOTAL = 6;
type Step = 1 | 2 | 3 | 4 | 5 | 6;

const FLAGS: { flag: WashFlag; label: string }[] = [
  { flag: 'car_not_found', label: 'Car not found' },
  { flag: 'car_covered', label: 'Car covered' },
  { flag: 'customer', label: 'Customer asked to skip' },
];

function Shell({
  step,
  title,
  children,
  footer,
  onClose,
}: {
  step: Step;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="bg-ink flex shrink-0 items-center gap-2 px-2 py-2 text-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to route"
          className="grid size-14 shrink-0 place-items-center rounded-full hover:bg-white/10"
        >
          <X className="size-6" aria-hidden />
        </button>
        <div className="flex-1 pr-4 [&_p]:text-white/80">
          <ProgressSteps current={step} total={TOTAL} />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-6">
        <h1 className="text-3xl">{title}</h1>
        <div className="mt-4 space-y-4">{children}</div>
      </div>
      <footer className="bg-surface border-border shrink-0 space-y-2 border-t px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {footer}
      </footer>
    </div>
  );
}

function PhotoStep({
  car,
  state,
  seed,
  taken,
  onTake,
}: {
  car: Car;
  state: 'dirty' | 'clean';
  seed?: number;
  taken: boolean;
  onTake: () => void;
}) {
  return taken ? (
    <div className="relative">
      <CarIllustration
        bodyType={car.bodyType}
        color={car.color}
        state={state}
        seed={seed}
        className="rounded-card border-border aspect-[5/3] w-full border"
        title={`${state === 'dirty' ? 'Before' : 'After'} photo`}
      />
      <span className="bg-success absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-white">
        <Check className="size-4" strokeWidth={3} aria-hidden />
        Photo saved
      </span>
    </div>
  ) : (
    <button
      type="button"
      onClick={onTake}
      className="border-primary bg-primary-soft text-primary rounded-card flex aspect-[5/3] w-full flex-col items-center justify-center gap-3 border-2 border-dashed text-xl font-semibold"
    >
      <Camera className="size-14" aria-hidden />
      Take photo
    </button>
  );
}

function DamageStep({
  car,
  seed,
  markers,
  onChange,
}: {
  car: Car;
  seed?: number;
  markers: DamageMarker[];
  onChange: (m: DamageMarker[]) => void;
}) {
  const addMarker = (e: MouseEvent<HTMLButtonElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    // Keyboard activation has no pointer position: place the marker in the centre.
    const viaKeyboard = e.detail === 0;
    const x = viaKeyboard ? 50 : ((e.clientX - box.left) / box.width) * 100;
    const y = viaKeyboard ? 60 : ((e.clientY - box.top) / box.height) * 100;
    onChange([...markers, { x: Math.round(x), y: Math.round(y), note: '' }]);
  };
  return (
    <>
      <p className="text-ink-2 text-lg">
        Tap the photo where you see a scratch or dent. Add a short note.
      </p>
      <div className="relative">
        <button
          type="button"
          onClick={addMarker}
          aria-label="Tap to mark damage on the car"
          className="block w-full"
        >
          <CarIllustration
            bodyType={car.bodyType}
            color={car.color}
            state="dirty"
            seed={seed}
            className="rounded-card border-border aspect-[5/3] w-full border"
          />
        </button>
        {markers.map((m, i) => (
          <span
            key={i}
            className="border-danger text-danger pointer-events-none absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] bg-white/70 text-sm font-bold"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          >
            {i + 1}
          </span>
        ))}
      </div>
      {markers.map((m, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              label={`Mark ${i + 1}`}
              value={m.note}
              placeholder="For example: scratch on rear bumper"
              onChange={(e) =>
                onChange(markers.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))
              }
              className="min-h-14"
            />
          </div>
          <button
            type="button"
            aria-label={`Remove mark ${i + 1}`}
            onClick={() => onChange(markers.filter((_, j) => j !== i))}
            className="border-border-strong grid size-14 shrink-0 place-items-center rounded-lg border"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      ))}
    </>
  );
}

function initialStep(wash: Wash): Step {
  if (wash.status === 'in_progress') return wash.checklist ? 4 : 3;
  return 1;
}

function Flow({ wash, car }: { wash: Wash; car: Car }) {
  const navigate = useNavigate();
  const compound = useDemoStore((s) => s.compounds.find((c) => c.id === wash.compoundId));
  const nextWash = useDemoStore((s) =>
    s.washes.find(
      (w) =>
        w.washerId === wash.washerId &&
        w.scheduledDate === wash.scheduledDate &&
        w.id !== wash.id &&
        (w.status === 'scheduled' || w.status === 'washer_on_site'),
    ),
  );
  const store = useDemoStore.getState();
  const [step, setStep] = useState<Step>(() => initialStep(wash));
  const [beforeTaken, setBeforeTaken] = useState(wash.status === 'in_progress');
  const [afterTaken, setAfterTaken] = useState(false);
  const [markers, setMarkers] = useState<DamageMarker[]>(wash.damageMarkers ?? []);
  const [marking, setMarking] = useState((wash.damageMarkers?.length ?? 0) > 0);
  const [checked, setChecked] = useState<Record<string, boolean>>({ ...wash.checklist });
  const [flagOpen, setFlagOpen] = useState(false);
  const exit = () => navigate('/washer/today');

  const items = [
    ...requiredChecklist(wash.type, wash.addOns)
      .filter((item) => item !== 'photos_taken')
      .map((item) => ({ key: item as string, label: CHECKLIST_LABEL[item] })),
    ...wash.addOns.map((id) => ({ key: `addon:${id}`, label: `${ADD_ONS[id].name} (extra)` })),
  ];
  const allChecked = items.every((i) => checked[i.key]);

  if (wash.status === 'completed' || wash.status === 'skipped') {
    const completed = wash.status === 'completed';
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <span
          className={cn(
            'grid size-24 place-items-center rounded-full',
            completed ? 'bg-success text-white' : 'bg-border text-ink-2',
          )}
        >
          {completed ? (
            <CheckCircle2 className="size-14" aria-hidden />
          ) : (
            <CircleAlert className="size-14" aria-hidden />
          )}
        </span>
        <h1 className="text-3xl">{completed ? 'Wash complete' : 'Wash skipped'}</h1>
        <p className="text-ink-2 text-lg">
          {carLabel(car)} · {car.parkingSpot}
          {completed && <span className="block">The customer has been sent the photos.</span>}
        </p>
        <div className="mt-4 w-full space-y-2">
          {nextWash && (
            <Button
              size="lg"
              block
              onClick={() => navigate(`/washer/wash/${nextWash.id}`, { replace: true })}
            >
              Next car
            </Button>
          )}
          <Button size="lg" block variant={nextWash ? 'secondary' : 'primary'} onClick={exit}>
            Back to route
          </Button>
        </div>
      </div>
    );
  }

  const flag = (f: WashFlag) => {
    store.flagWash(wash.id, f);
    setFlagOpen(false);
    toast.show('Wash skipped', 'The customer and the office have been told.');
  };

  const saveDraft = (nextChecked = checked) =>
    store.saveWashDraft(wash.id, {
      checklist: nextChecked,
      damageMarkers: markers.filter((m) => m.note.trim()),
    });

  switch (step) {
    case 1:
      return (
        <Shell
          step={1}
          title="Find the car"
          onClose={exit}
          footer={
            <>
              <Button
                size="lg"
                block
                onClick={() => {
                  store.washArrive(wash.id);
                  setStep(2);
                }}
              >
                I found the car
              </Button>
              <Button size="lg" block variant="secondary" onClick={() => setFlagOpen(true)}>
                Cannot wash this car
              </Button>
              <BottomSheet
                open={flagOpen}
                onOpenChange={setFlagOpen}
                title="Why can’t you wash it?"
              >
                <div className="space-y-2 pb-2">
                  {FLAGS.map((f) => (
                    <Button
                      key={f.flag}
                      size="lg"
                      block
                      variant="secondary"
                      onClick={() => flag(f.flag)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </BottomSheet>
            </>
          }
        >
          <div className="bg-primary rounded-card p-5 text-white">
            <p className="flex items-center gap-2 text-lg">
              <MapPin className="size-5" aria-hidden />
              {car.parkingZone}
            </p>
            <p className="mt-1 text-5xl font-semibold">{car.parkingSpot}</p>
            {compound && <p className="mt-1 text-white/80">{compound.name}</p>}
          </div>
          <CarIllustration
            bodyType={car.bodyType}
            color={car.color}
            state="dirty"
            seed={4}
            className="rounded-card border-border aspect-[5/2] w-full border"
          />
          <dl className="text-lg">
            <div className="border-border flex justify-between border-b py-2.5">
              <dt className="text-ink-2">Car</dt>
              <dd className="font-semibold">
                {CAR_COLOR_LABEL[car.color]} {carLabel(car)}
              </dd>
            </div>
            <div className="border-border flex justify-between border-b py-2.5">
              <dt className="text-ink-2">Plate</dt>
              <dd className="font-semibold">{car.plate}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-ink-2">Wash</dt>
              <dd className="text-right font-semibold">
                {WASH_TYPE_LABEL[wash.type]}
                {wash.addOns.map((id) => (
                  <span key={id} className="text-warning block text-base">
                    + {ADD_ONS[id].name}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
          {car.notes && (
            <p className="bg-warning-soft rounded-card flex gap-2 p-3 text-lg">
              <CircleAlert className="text-warning mt-1 size-5 shrink-0" aria-hidden />
              {car.notes}
            </p>
          )}
        </Shell>
      );
    case 2:
      return (
        <Shell
          step={2}
          title="Before photo"
          onClose={exit}
          footer={
            <Button
              size="lg"
              block
              disabled={!beforeTaken}
              onClick={() => {
                store.washStart(wash.id);
                setStep(3);
              }}
            >
              {beforeTaken ? 'Continue' : 'Take the photo first'}
            </Button>
          }
        >
          <PhotoStep
            car={car}
            state="dirty"
            seed={wash.beforePhotoSeed ?? 7}
            taken={beforeTaken}
            onTake={() => setBeforeTaken(true)}
          />
        </Shell>
      );
    case 3:
      return (
        <Shell
          step={3}
          title="Any damage already on the car?"
          onClose={exit}
          footer={
            marking ? (
              <>
                <Button
                  size="lg"
                  block
                  disabled={markers.length === 0 || markers.some((m) => !m.note.trim())}
                  onClick={() => {
                    saveDraft();
                    setStep(4);
                  }}
                >
                  {markers.length === 0 ? 'Tap the photo to mark' : 'Save marks and continue'}
                </Button>
                <Button
                  size="lg"
                  block
                  variant="secondary"
                  onClick={() => {
                    setMarkers([]);
                    setMarking(false);
                  }}
                >
                  No damage after all
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" block onClick={() => setStep(4)}>
                  No damage
                </Button>
                <Button size="lg" block variant="secondary" onClick={() => setMarking(true)}>
                  Mark damage
                </Button>
              </>
            )
          }
        >
          {marking ? (
            <DamageStep
              car={car}
              seed={wash.beforePhotoSeed}
              markers={markers}
              onChange={setMarkers}
            />
          ) : (
            <>
              <p className="text-ink-2 text-lg">
                Look for scratches and dents before you start. Marking them protects you and the
                customer.
              </p>
              <CarIllustration
                bodyType={car.bodyType}
                color={car.color}
                state="dirty"
                seed={wash.beforePhotoSeed}
                className="rounded-card border-border aspect-[5/3] w-full border"
              />
            </>
          )}
        </Shell>
      );
    case 4:
      return (
        <Shell
          step={4}
          title="Checklist"
          onClose={exit}
          footer={
            <Button size="lg" block disabled={!allChecked} onClick={() => setStep(5)}>
              {allChecked
                ? 'Continue'
                : `${items.filter((i) => checked[i.key]).length} of ${items.length} done`}
            </Button>
          }
        >
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.key}>
                <label
                  className={cn(
                    'rounded-card flex min-h-16 cursor-pointer items-center gap-4 border-2 px-4 text-xl font-medium',
                    checked[item.key]
                      ? 'border-success bg-success-soft'
                      : 'border-border bg-surface',
                  )}
                >
                  <input
                    type="checkbox"
                    className="accent-success size-7 shrink-0"
                    checked={Boolean(checked[item.key])}
                    onChange={(e) => {
                      const next = { ...checked, [item.key]: e.target.checked };
                      setChecked(next);
                      saveDraft(next);
                    }}
                  />
                  {item.label}
                </label>
              </li>
            ))}
          </ul>
        </Shell>
      );
    case 5:
      return (
        <Shell
          step={5}
          title="After photo"
          onClose={exit}
          footer={
            <Button size="lg" block disabled={!afterTaken} onClick={() => setStep(6)}>
              {afterTaken ? 'Continue' : 'Take the photo first'}
            </Button>
          }
        >
          <PhotoStep
            car={car}
            state="clean"
            seed={wash.beforePhotoSeed}
            taken={afterTaken}
            onTake={() => setAfterTaken(true)}
          />
        </Shell>
      );
    default: {
      const noted = markers.filter((m) => m.note.trim());
      return (
        <Shell
          step={6}
          title="Finish this wash?"
          onClose={exit}
          footer={
            <Button
              size="lg"
              block
              onClick={() =>
                store.washComplete(wash.id, {
                  damageMarkers: noted,
                  washerNote: noted.map((m) => m.note.trim()).join('; ') || undefined,
                })
              }
            >
              Complete wash
            </Button>
          }
        >
          <ul className="space-y-3 text-xl">
            {['Before photo', `${items.length} checklist items`, 'After photo'].map((line) => (
              <li key={line} className="flex items-center gap-3">
                <span className="bg-success grid size-8 place-items-center rounded-full text-white">
                  <Check className="size-5" strokeWidth={3} aria-hidden />
                </span>
                {line}
              </li>
            ))}
            {noted.length > 0 && (
              <li className="flex items-center gap-3">
                <span className="bg-warning grid size-8 place-items-center rounded-full text-white">
                  <CircleAlert className="size-5" aria-hidden />
                </span>
                {noted.length} existing mark{noted.length > 1 ? 's' : ''} noted
              </li>
            )}
          </ul>
          <p className="text-ink-2 text-lg">The customer gets the photos straight away.</p>
        </Shell>
      );
    }
  }
}

export function WashFlowPage() {
  const { washId } = useParams();
  const wash = useDemoStore((s) => s.washes.find((w) => w.id === washId));
  const car = useDemoStore((s) => s.cars.find((c) => c.id === wash?.carId));
  const navigate = useNavigate();

  if (!wash || !car || wash.scheduledDate !== toISODate(new Date())) {
    return (
      <div className="p-4">
        <EmptyState
          icon={SearchX}
          title="This wash is not on today’s route."
          action={
            <Button size="lg" onClick={() => navigate('/washer/today')}>
              Back to route
            </Button>
          }
        />
      </div>
    );
  }
  // Keyed by wash so "Next car" starts a fresh flow.
  return <Flow key={wash.id} wash={wash} car={car} />;
}
