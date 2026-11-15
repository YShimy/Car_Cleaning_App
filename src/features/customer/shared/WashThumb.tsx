import { CarIllustration } from '@/components/app/CarIllustration';
import { cn } from '@/lib/cn';
import type { Car } from '@/types/domain';

/** Small before | after pair used in lists. Decorative: the row has the text. */
export function WashThumb({
  car,
  beforeSeed,
  afterSeed,
  className,
}: {
  car: Pick<Car, 'bodyType' | 'color'>;
  beforeSeed?: number;
  afterSeed?: number;
  className?: string;
}) {
  return (
    <span className={cn('border-border flex overflow-hidden rounded-lg border', className)}>
      <CarIllustration
        bodyType={car.bodyType}
        color={car.color}
        state="dirty"
        seed={beforeSeed}
        className="h-full w-1/2"
      />
      <CarIllustration
        bodyType={car.bodyType}
        color={car.color}
        state="clean"
        seed={afterSeed}
        className="border-surface h-full w-1/2 border-l-2"
      />
    </span>
  );
}
