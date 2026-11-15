import { Check, CircleAlert, Flag, SearchX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { BeforeAfterSlider } from '@/components/app/BeforeAfterSlider';
import { CarIllustration, CarPhoto } from '@/components/app/CarIllustration';
import { PageHeader } from '@/components/app/PageHeader';
import { WashStatusChip } from '@/components/app/WashStatusChip';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StarRating } from '@/components/ui/StarRating';
import { SegmentedTabs } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/toast';
import { ADD_ONS } from '@/config/business';
import { RATING_TAGS, WASH_TYPE_LABEL } from '@/config/copy';
import { carLabel } from '@/data/cars';
import { cn } from '@/lib/cn';
import { formatDateLong, formatTime } from '@/lib/format';
import { CHECKLIST_LABEL, requiredChecklist } from '@/lib/rules';
import { washMinutes } from '@/lib/selectors';
import { useDemoStore } from '@/store/demoStore';
import { useCustomer } from '@/store/hooks';
import type { Car, Wash, WashRating } from '@/types/domain';
import { SummaryRow } from '../onboarding/StepReview';

const NOT_DONE_COPY: Partial<Record<Wash['status'], string>> = {
  skipped: 'This wash was skipped, so there are no photos.',
  missed:
    'We missed this wash. We are sorry. If it has not been made up yet, report it and we will add an extra wash.',
  weather_delayed: 'This wash was delayed by the weather and moved to the next wash day.',
  scheduled: 'This wash has not happened yet. Photos appear here when it is done.',
  washer_on_site: 'The washer is in your compound. Photos appear here when the wash is done.',
  in_progress: 'Your car is being washed now. Photos appear here in a few minutes.',
};

function RatingBlock({ wash }: { wash: Wash }) {
  const [stars, setStars] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const { hash } = useLocation();

  useEffect(() => {
    if (hash === '#rate') ref.current?.scrollIntoView({ block: 'center' });
  }, [hash]);

  if (wash.rating) {
    return (
      <Card className="text-center">
        <SectionTitle>Your rating</SectionTitle>
        <div className="mt-2">
          <StarRating value={wash.rating.stars} label="Your rating" />
        </div>
        {wash.rating.tags.length > 0 && (
          <p className="text-ink-2 mt-2 text-sm">{wash.rating.tags.join(' · ')}</p>
        )}
      </Card>
    );
  }

  const options = stars === 0 ? [] : stars >= 4 ? RATING_TAGS.positive : RATING_TAGS.negative;
  const submit = () => {
    useDemoStore.getState().rateWash(wash.id, { stars: stars as WashRating['stars'], tags });
    toast.success('Thanks for your rating');
  };

  return (
    <Card ref={ref} id="rate" className="text-center">
      <SectionTitle>How was this wash?</SectionTitle>
      <p className="text-ink-2 mb-2 text-sm">Optional. It helps us and your washer.</p>
      <StarRating
        value={stars}
        onChange={(s) => {
          setStars(s);
          setTags([]); // tags differ for good and bad ratings
        }}
      />
      {options.length > 0 && (
        <>
          <div
            className="mt-3 flex flex-wrap justify-center gap-2"
            role="group"
            aria-label="What stood out?"
          >
            {options.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTags(on ? tags.filter((t) => t !== tag) : [...tags, tag])}
                  className={cn(
                    'min-h-11 rounded-full border px-4 text-sm font-medium',
                    on
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border-strong bg-surface',
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <Button block className="mt-4" onClick={submit}>
            Submit rating
          </Button>
        </>
      )}
    </Card>
  );
}

function Photos({ wash, car }: { wash: Wash; car: Car }) {
  const label = carLabel(car);
  return (
    <BeforeAfterSlider
      before={
        <CarPhoto
          carId={car.id}
          bodyType={car.bodyType}
          color={car.color}
          state="dirty"
          seed={wash.beforePhotoSeed}
          alt={`${label} before the wash`}
        />
      }
      after={
        <CarPhoto
          carId={car.id}
          bodyType={car.bodyType}
          color={car.color}
          state="clean"
          seed={wash.afterPhotoSeed}
          alt={`${label} after the wash`}
        />
      }
    />
  );
}

export function WashDetailPage() {
  const { washId } = useParams();
  const { customer, cars } = useCustomer();
  const wash = useDemoStore((s) =>
    s.washes.find((w) => w.id === washId && w.customerId === customer.id),
  );
  const washer = useDemoStore((s) => s.washers.find((w) => w.id === wash?.washerId));
  const car = cars.find((c) => c.id === wash?.carId);

  if (!wash || !car) {
    return (
      <div>
        <PageHeader title="Wash" backTo="/customer/washes" />
        <EmptyState icon={SearchX} title="We could not find this wash." />
      </div>
    );
  }

  const reportLink = (
    <Link
      to={`/customer/support/report?wash=${wash.id}`}
      className="text-primary flex min-h-12 items-center justify-center gap-2 font-medium underline underline-offset-2"
    >
      <Flag className="size-4" aria-hidden />
      Report a problem with this wash
    </Link>
  );

  if (wash.status !== 'completed') {
    return (
      <div className="space-y-4">
        <PageHeader title={formatDateLong(wash.scheduledDate)} backTo="/customer/washes" />
        <Card className="space-y-3">
          <WashStatusChip status={wash.status} />
          <p>{NOT_DONE_COPY[wash.status]}</p>
          {wash.rescheduledTo && (
            <p className="font-medium">New date: {formatDateLong(wash.rescheduledTo)}</p>
          )}
        </Card>
        {(wash.status === 'missed' || wash.status === 'skipped') && reportLink}
      </div>
    );
  }

  const minutes = washMinutes(wash);
  const checklist = requiredChecklist(wash.type, wash.addOns);

  return (
    <div className="space-y-4">
      <PageHeader title={formatDateLong(wash.scheduledDate)} backTo="/customer/washes" />
      <SegmentedTabs
        label="Wash information"
        tabs={[
          {
            value: 'photos',
            label: 'Photos',
            content: (
              <div className="space-y-2">
                <Photos wash={wash} car={car} />
                <p className="text-ink-2 text-center text-sm">
                  Drag the handle to compare before and after.
                </p>
              </div>
            ),
          },
          {
            value: 'checklist',
            label: 'Checklist',
            content: (
              <Card>
                <ul className="space-y-3">
                  {checklist.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="bg-success grid size-6 shrink-0 place-items-center rounded-full text-white">
                        <Check className="size-4" strokeWidth={3} aria-hidden />
                      </span>
                      {CHECKLIST_LABEL[item]}
                      <span className="sr-only">(done)</span>
                    </li>
                  ))}
                  {wash.addOns.map((id) => (
                    <li key={id} className="flex items-center gap-3">
                      <span className="bg-success grid size-6 shrink-0 place-items-center rounded-full text-white">
                        <Check className="size-4" strokeWidth={3} aria-hidden />
                      </span>
                      {ADD_ONS[id].name} <span className="text-ink-2 text-sm">(extra)</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ),
          },
          {
            value: 'details',
            label: 'Details',
            content: (
              <Card>
                <dl className="divide-border divide-y">
                  <SummaryRow label="Car">
                    {carLabel(car)} · {car.parkingSpot}
                  </SummaryRow>
                  <SummaryRow label="Type">{WASH_TYPE_LABEL[wash.type]}</SummaryRow>
                  {washer && <SummaryRow label="Washer">{washer.name} · ID verified</SummaryRow>}
                  {wash.startedAt && wash.completedAt && (
                    <SummaryRow label="Time">
                      {formatTime(wash.startedAt)} – {formatTime(wash.completedAt)}
                      {minutes !== null && (
                        <span className="text-ink-2 font-normal">
                          {' '}
                          ({Math.max(1, Math.round(minutes))} min)
                        </span>
                      )}
                    </SummaryRow>
                  )}
                  {wash.rescheduledFrom && (
                    <SummaryRow label="Moved from">
                      {formatDateLong(wash.rescheduledFrom)} (weather)
                    </SummaryRow>
                  )}
                </dl>
              </Card>
            ),
          },
        ]}
      />

      {wash.washerNote && (
        <Card className="border-warning/30 bg-warning-soft shadow-none">
          <p className="text-warning flex items-center gap-2 text-sm font-semibold">
            <CircleAlert className="size-4" aria-hidden />
            Note from your washer, before the wash
          </p>
          <p className="mt-1">{wash.washerNote}</p>
          {wash.damageMarkers && wash.damageMarkers.length > 0 && (
            <div className="border-border relative mt-3 overflow-hidden rounded-lg border">
              <CarIllustration
                bodyType={car.bodyType}
                color={car.color}
                state="dirty"
                seed={wash.beforePhotoSeed}
                className="aspect-[5/3] w-full"
                title="Before photo with the noted mark"
              />
              {wash.damageMarkers.map((m, i) => (
                <span
                  key={i}
                  title={m.note}
                  className="border-danger absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-white/30"
                  style={{ left: `${m.x}%`, top: `${m.y}%` }}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      <RatingBlock key={wash.id} wash={wash} />
      {reportLink}
    </div>
  );
}
