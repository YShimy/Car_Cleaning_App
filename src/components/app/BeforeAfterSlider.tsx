import { ChevronsLeftRight } from 'lucide-react';
import { useState, type KeyboardEvent, type ReactNode } from 'react';

/**
 * Before/after comparison. A native range input covers the picture, so
 * mouse drag, touch drag and keyboard (arrows, Home, End) all work and
 * screen readers announce it as a slider.
 */
export function BeforeAfterSlider({
  before,
  after,
  initial = 50,
}: {
  before: ReactNode;
  after: ReactNode;
  initial?: number;
}) {
  const [position, setPosition] = useState(initial);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const next =
      e.key === 'ArrowLeft' || e.key === 'ArrowDown'
        ? position - step
        : e.key === 'ArrowRight' || e.key === 'ArrowUp'
          ? position + step
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? 100
              : null;
    if (next === null) return;
    e.preventDefault();
    setPosition(Math.max(0, Math.min(100, next)));
  };

  return (
    <div className="rounded-card border-border relative aspect-[5/3] w-full overflow-hidden border select-none">
      <div className="absolute inset-0 [&>*]:size-full">{after}</div>
      <div
        className="absolute inset-0 [&>*]:size-full"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        data-testid="before-layer"
      >
        {before}
      </div>

      <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
        Before
      </span>
      <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
        After
      </span>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.15)]"
        style={{ left: `${position}%` }}
      >
        <span className="text-primary shadow-card absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white">
          <ChevronsLeftRight className="size-5" />
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        onKeyDown={onKeyDown}
        aria-label="Before and after comparison"
        aria-valuetext={`${position}% before, ${100 - position}% after`}
        className="peer absolute inset-0 size-full cursor-ew-resize opacity-0"
        style={{ touchAction: 'pan-y' }}
      />
      <span className="peer-focus-visible:ring-primary pointer-events-none absolute inset-0 rounded-[inherit] peer-focus-visible:ring-4 peer-focus-visible:ring-inset" />
    </div>
  );
}
