import { BeforeAfterSlider } from '@/components/app/BeforeAfterSlider';
import { CarIllustration } from '@/components/app/CarIllustration';
import { CAR_COLOR_LABEL, CAR_COLORS } from '@/data/cars';
import type { BodyType } from '@/types/domain';

const BODY_TYPES: BodyType[] = ['sedan', 'hatchback', 'suv', 'pickup'];

/** 4 body types × 7 colours × dirty/clean, plus the comparison slider. */
export function CarGallery() {
  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <BeforeAfterSlider
          before={
            <CarIllustration
              bodyType="sedan"
              color="white"
              state="dirty"
              seed={14}
              title="Before"
            />
          }
          after={
            <CarIllustration bodyType="sedan" color="white" state="clean" seed={14} title="After" />
          }
        />
      </div>
      {BODY_TYPES.map((bodyType) => (
        <div key={bodyType}>
          <h3 className="mb-2 text-base capitalize">{bodyType}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {CAR_COLORS.map((color, i) => (
              <figure key={color} className="space-y-1">
                <CarIllustration
                  bodyType={bodyType}
                  color={color}
                  state="dirty"
                  seed={i + 3}
                  className="rounded-lg"
                  title={`${CAR_COLOR_LABEL[color]} ${bodyType}, dirty`}
                />
                <CarIllustration
                  bodyType={bodyType}
                  color={color}
                  state="clean"
                  seed={i + 3}
                  className="rounded-lg"
                  title={`${CAR_COLOR_LABEL[color]} ${bodyType}, clean`}
                />
                <figcaption className="text-ink-2 text-xs">{CAR_COLOR_LABEL[color]}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
