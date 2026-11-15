import { CalendarPlus, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/toast';
import { carLabel } from '@/data/cars';
import { firstName, formatDateLong, SERVICE_WINDOW_LABEL } from '@/lib/format';
import { buildWashICS, downloadTextFile } from '@/lib/ics';
import { upcomingWashes } from '@/lib/selectors';
import { useDemoStore } from '@/store/demoStore';
import { useCustomer } from '@/store/hooks';
import { useOnboardingDraft } from './draft';

export function DoneStep() {
  const navigate = useNavigate();
  const { customer, compound, cars } = useCustomer();
  const washes = useDemoStore((s) => s.washes);
  const next = upcomingWashes(washes, customer.id, new Date())[0];
  const car = cars.find((c) => c.id === next?.carId) ?? cars[0];

  const addToCalendar = () => {
    if (!next) return;
    downloadTextFile(
      'lamaa-car-wash.ics',
      buildWashICS({
        firstDate: next.scheduledDate,
        location: `${compound.name}, ${car.parkingZone}, ${car.parkingSpot}`,
        car: carLabel(car),
      }),
      'text/calendar',
    );
    toast.success('Calendar file downloaded');
  };

  const goHome = () => {
    useOnboardingDraft.getState().reset();
    navigate('/customer/home', { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 pt-16 pb-6 text-center">
        <span className="bg-success animate-check-pop grid size-20 place-items-center rounded-full text-white">
          <svg
            viewBox="0 0 24 24"
            className="size-11"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path
              d="M5 12.5l4.500 4.500L19 7.500"
              strokeDasharray="30"
              className="animate-check-draw"
            />
          </svg>
        </span>
        <h1 className="mt-6 text-3xl">You’re all set, {firstName(customer.name)}!</h1>
        <p className="text-ink-2 mt-2">Nothing else to do. We will message you the day before.</p>
        {next && (
          <Card className="mt-8 w-full text-left">
            <p className="text-ink-2 text-sm">Your first wash</p>
            <p className="mt-1 text-xl font-semibold">{formatDateLong(next.scheduledDate)}</p>
            <p className="text-ink-2 mt-1 flex items-center gap-1.5 text-sm">
              <Clock className="size-4" aria-hidden />
              {SERVICE_WINDOW_LABEL} · {carLabel(car)} · {car.parkingSpot}
            </p>
          </Card>
        )}
      </div>
      <footer className="space-y-2 px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button block onClick={goHome}>
          Go to home
        </Button>
        <Button block variant="secondary" onClick={addToCalendar}>
          <CalendarPlus className="size-5" aria-hidden />
          Add to calendar
        </Button>
      </footer>
    </div>
  );
}
