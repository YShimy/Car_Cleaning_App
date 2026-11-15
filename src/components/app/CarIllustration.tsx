import { useId, useMemo } from 'react';
import { PHOTO_OVERRIDES } from '@/config/photos';
import { CAR_COLOR_HEX } from '@/data/cars';
import { createRng } from '@/data/prng';
import type { BodyType, CarColor } from '@/types/domain';

interface Shape {
  body: string;
  windows: string[];
  /** Wheel centres (x) and radius. */
  wheels: [number, number];
  wheelRadius: number;
  doorX: number;
  /** y of the top of the lower body, used for lights and the door line. */
  beltY: number;
  front: [number, number];
  rear: [number, number];
}

/** Side views, front of the car on the left. Canvas is 400 × 240, ground at y = 190. */
const SHAPES: Record<BodyType, Shape> = {
  sedan: {
    body: 'M48 172 L48 150 Q50 136 70 132 L128 126 L160 98 Q166 92 178 92 L250 92 Q262 92 272 100 L300 126 L340 130 Q354 132 356 146 L356 172 Z',
    windows: [
      'M137 126 L163 102 Q167 98 175 98 L204 98 L204 126 Z',
      'M211 98 L248 98 Q257 98 263 104 L287 126 L211 126 Z',
    ],
    wheels: [108, 296],
    wheelRadius: 22,
    doorX: 207,
    beltY: 132,
    front: [50, 140],
    rear: [348, 138],
  },
  hatchback: {
    body: 'M66 172 L66 148 Q68 134 88 130 L136 124 L166 96 Q172 90 184 90 L266 90 Q280 90 288 100 L314 128 Q334 132 336 148 L336 172 Z',
    windows: [
      'M145 124 L169 100 Q173 96 181 96 L212 96 L212 124 Z',
      'M219 96 L264 96 Q273 96 279 103 L298 124 L219 124 Z',
    ],
    wheels: [120, 284],
    wheelRadius: 21,
    doorX: 215,
    beltY: 130,
    front: [68, 140],
    rear: [329, 138],
  },
  suv: {
    body: 'M46 172 L46 140 Q48 124 70 120 L122 114 L150 84 Q156 78 168 78 L290 78 Q304 78 310 88 L330 116 Q354 120 356 138 L356 172 Z',
    windows: [
      'M131 114 L154 89 Q158 84 167 84 L212 84 L212 114 Z',
      'M219 84 L288 84 Q297 84 302 92 L316 114 L219 114 Z',
    ],
    wheels: [108, 294],
    wheelRadius: 25,
    doorX: 215,
    beltY: 122,
    front: [48, 132],
    rear: [348, 130],
  },
  pickup: {
    body: 'M44 172 L44 142 Q46 128 66 124 L120 118 L146 88 Q152 82 164 82 L224 82 Q234 82 236 92 L238 122 L352 122 Q358 122 358 130 L358 172 Z',
    windows: [
      'M129 118 L150 93 Q154 88 163 88 L188 88 L188 118 Z',
      'M195 88 L222 88 Q229 88 230 94 L231 118 L195 118 Z',
    ],
    wheels: [106, 298],
    wheelRadius: 25,
    doorX: 191,
    beltY: 126,
    front: [46, 134],
    rear: [351, 132],
  },
};

const GROUND_Y = 190;

/** Four-point sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;

export interface CarIllustrationProps {
  bodyType: BodyType;
  color: CarColor;
  state: 'dirty' | 'clean';
  seed?: number;
  /** Accessible description; omit for decorative use. */
  title?: string;
  className?: string;
}

/**
 * The demo's "photo": a car in its parking spot, dirty or clean.
 * Dirt and sparkles are seeded so the same wash always looks the same.
 */
export function CarIllustration({
  bodyType,
  color,
  state,
  seed = 1,
  title,
  className,
}: CarIllustrationProps) {
  const uid = useId().replace(/:/g, '');
  const shape = SHAPES[bodyType];
  const paint = CAR_COLOR_HEX[color];
  const dirty = state === 'dirty';
  const wheelY = GROUND_Y - shape.wheelRadius;

  const details = useMemo(() => {
    const rng = createRng(seed * 7919 + bodyType.length);
    const specks = Array.from({ length: 46 }, () => ({
      x: rng.int(48, 356),
      y: rng.int(96, 170),
      r: 0.8 + rng.next() * 2.4,
      o: 0.25 + rng.next() * 0.4,
    }));
    // Uneven top edge of the mud band along the sills.
    let mud = `M40 176 L40 ${152 + rng.int(0, 6)}`;
    for (let x = 60; x <= 360; x += 20) mud += ` L${x} ${148 + rng.int(0, 10)}`;
    mud += ' L360 176 Z';
    const streaks = Array.from({ length: 5 }, () => ({ x: rng.int(70, 330), h: rng.int(10, 26) }));
    const sparkles = [
      { x: rng.int(70, 120), y: rng.int(108, 124), r: 7 },
      { x: rng.int(180, 240), y: rng.int(74, 86), r: 9 },
      { x: rng.int(300, 345), y: rng.int(108, 122), r: 6 },
      { x: rng.int(150, 260), y: rng.int(140, 152), r: 5 },
    ];
    return { specks, mud, streaks, sparkles };
  }, [seed, bodyType]);

  return (
    <svg
      viewBox="0 0 400 240"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <clipPath id={`${uid}-body`}>
          <path d={shape.body} />
        </clipPath>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9eefb" />
          <stop offset="1" stopColor="#8fb9d6" />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Parking garage: wall, pillar, floor, bay lines */}
      <rect width="400" height="240" fill="#e3e6eb" />
      <rect y="0" width="400" height="26" fill="#d3d7de" />
      <rect x="14" y="26" width="30" height="150" fill="#cdd2d9" />
      <rect x="14" y="140" width="30" height="36" fill="#f2c230" />
      <path d="M14 152 L26 140 H36 L14 162 Z M14 176 L44 146 V156 L24 176 Z" fill="#2b2f36" />
      <rect x="320" y="44" width="46" height="26" rx="4" fill="#0e5e8c" />
      <text
        x="343"
        y="62"
        textAnchor="middle"
        fontSize="15"
        fontWeight="600"
        fill="#fff"
        fontFamily="Inter, sans-serif"
      >
        P
      </text>
      <rect y="176" width="400" height="64" fill="#c2c7cf" />
      <rect y="176" width="400" height="3" fill="#a9afb8" />
      <path
        d="M22 240 L52 196 H58 L30 240 Z M370 240 L342 196 H348 L378 240 Z"
        fill="#f5f6f8"
        opacity="0.9"
      />

      {/* Shadow under the car */}
      <ellipse cx="202" cy={GROUND_Y + 2} rx="168" ry="9" fill="#000" opacity="0.2" />

      {/* Body */}
      <path
        d={shape.body}
        fill={paint}
        stroke="#000"
        strokeOpacity="0.28"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <g clipPath={`url(#${uid}-body)`}>
        {/* shading towards the sills */}
        <rect x="40" y="152" width="320" height="24" fill="#000" opacity="0.16" />
        {!dirty && <rect x="40" y="70" width="320" height="66" fill={`url(#${uid}-shine)`} />}
        {!dirty && <path d="M60 134 H346" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />}
        {dirty && (
          <>
            <rect x="40" y="70" width="320" height="110" fill="#8a7355" opacity="0.3" />
            <path d={details.mud} fill="#6b5640" opacity="0.62" />
            {details.streaks.map((s, i) => (
              <rect
                key={i}
                x={s.x}
                y={150 - s.h}
                width="3"
                height={s.h}
                rx="1.5"
                fill="#6b5640"
                opacity="0.3"
              />
            ))}
            {details.specks.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#5d4a36" opacity={s.o} />
            ))}
          </>
        )}
      </g>

      {/* Windows */}
      {shape.windows.map((d) => (
        <path
          key={d}
          d={d}
          fill={dirty ? '#a3a9a6' : `url(#${uid}-glass)`}
          stroke="#1d232b"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
      ))}
      {!dirty && (
        <path
          d={`M${shape.doorX - 44} ${shape.beltY - 10} l14 -18 h7 l-14 18 Z M${shape.doorX + 26} ${shape.beltY - 10} l14 -18 h5 l-14 18 Z`}
          fill="#fff"
          opacity="0.55"
        />
      )}
      {dirty && shape.windows.map((d) => <path key={d} d={d} fill="#7d6a50" opacity="0.28" />)}

      {/* Door line, handle, lights */}
      <path
        d={`M${shape.doorX} ${shape.beltY - 4} V166`}
        stroke="#000"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <rect
        x={shape.doorX + 10}
        y={shape.beltY + 8}
        width="16"
        height="4"
        rx="2"
        fill="#000"
        opacity="0.3"
      />
      <rect
        x={shape.front[0]}
        y={shape.front[1]}
        width="14"
        height="8"
        rx="3"
        fill={dirty ? '#d9d2b8' : '#fff7d6'}
        stroke="#000"
        strokeOpacity="0.25"
      />
      <rect
        x={shape.rear[0] - 6}
        y={shape.rear[1]}
        width="12"
        height="8"
        rx="3"
        fill={dirty ? '#8e4a44' : '#d93025'}
        stroke="#000"
        strokeOpacity="0.25"
      />

      {/* Wheels */}
      {shape.wheels.map((x) => (
        <g key={x}>
          <circle cx={x} cy={wheelY} r={shape.wheelRadius + 4} fill="#16191e" />
          <circle cx={x} cy={wheelY} r={shape.wheelRadius} fill={dirty ? '#3a3632' : '#22262c'} />
          <circle
            cx={x}
            cy={wheelY}
            r={shape.wheelRadius * 0.6}
            fill={dirty ? '#8f887c' : '#d5dae0'}
          />
          <circle
            cx={x}
            cy={wheelY}
            r={shape.wheelRadius * 0.6}
            fill="none"
            stroke="#000"
            strokeOpacity="0.25"
          />
          {[0, 72, 144, 216, 288].map((a) => (
            <path
              key={a}
              d={`M${x} ${wheelY} L${x} ${wheelY - shape.wheelRadius * 0.55}`}
              stroke={dirty ? '#6f695f' : '#9aa1ab'}
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${a} ${x} ${wheelY})`}
            />
          ))}
          <circle cx={x} cy={wheelY} r="3.5" fill={dirty ? '#5b554c' : '#7d8590'} />
        </g>
      ))}

      {/* Clean: sparkles */}
      {!dirty &&
        details.sparkles.map((s, i) => (
          <path key={i} d={sparkle(s.x, s.y, s.r)} fill="#fff" stroke="#f2c230" strokeWidth="0.8" />
        ))}
    </svg>
  );
}

/**
 * A wash photo: a real image if one is configured in `config/photos.ts`,
 * otherwise the illustration.
 */
export function CarPhoto({
  carId,
  alt,
  ...props
}: CarIllustrationProps & { carId: string; alt: string }) {
  const override = PHOTO_OVERRIDES[carId]?.[props.state === 'dirty' ? 'before' : 'after'];
  if (override) {
    return <img src={override} alt={alt} className={`${props.className ?? ''} object-cover`} />;
  }
  return <CarIllustration {...props} title={alt} />;
}
