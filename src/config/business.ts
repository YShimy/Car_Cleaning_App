/**
 * Every business number in the demo lives here.
 * All values are ASSUMPTIONS — change them once you have real numbers.
 * The mock data (customers per compound, capacity, revenue) adapts on
 * the next "Reset demo".
 */
import type { AddOnId, PaymentMethod, PlanId } from '@/types/domain';

export interface PlanConfig {
  id: PlanId;
  name: string;
  pricePerMonth: number; // EGP
  exteriorPerWeek: 1 | 2;
  interiorPerMonth: 0 | 1 | 2;
  inclusions: string[];
  popular?: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  essential: {
    id: 'essential',
    name: 'Essential',
    pricePerMonth: 650,
    exteriorPerWeek: 1,
    interiorPerMonth: 0,
    inclusions: ['1 exterior wash every week', 'Before and after photos'],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    pricePerMonth: 950,
    exteriorPerWeek: 1,
    interiorPerMonth: 1,
    inclusions: [
      '1 exterior wash every week',
      '1 interior clean every month',
      'Before and after photos',
    ],
    popular: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    pricePerMonth: 1600,
    exteriorPerWeek: 2,
    interiorPerMonth: 2,
    inclusions: [
      '2 exterior washes every week',
      '2 interior cleans every month',
      'Before and after photos',
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ['essential', 'plus', 'premium'];

export interface AddOnConfig {
  id: AddOnId;
  name: string;
  price: number; // EGP
  description: string;
}

export const ADD_ONS: Record<AddOnId, AddOnConfig> = {
  deep_interior: {
    id: 'deep_interior',
    name: 'Deep interior clean',
    price: 350,
    description: 'Full vacuum, dashboard, door panels and vents.',
  },
  wax_polish: {
    id: 'wax_polish',
    name: 'Hand wax & polish',
    price: 450,
    description: 'Protective wax applied by hand for a lasting shine.',
  },
  tire_shine: {
    id: 'tire_shine',
    name: 'Tire shine',
    price: 80,
    description: 'Tires cleaned and dressed.',
  },
  seat_shampoo: {
    id: 'seat_shampoo',
    name: 'Seat fabric shampoo',
    price: 500,
    description: 'Fabric seats shampooed and dried.',
  },
};

export const ADD_ON_ORDER: AddOnId[] = [
  'deep_interior',
  'wax_polish',
  'tire_shine',
  'seat_shampoo',
];

/** Washes one washer can complete in one service day. */
export const WASHES_PER_WASHER_PER_DAY = 14;

/** Discount on each additional car's plan (family plan). */
export const FAMILY_DISCOUNT = 0.15;

/** Service window shown to customers (24h clock). */
export const SERVICE_WINDOW = { startHour: 8, endHour: 14 } as const;

/** A wash can be skipped until this hour (24h clock) the day before. */
export const SKIP_CUTOFF_HOUR = 20;

/** A skipped wash is credited as one free add-on of this kind. */
export const SKIP_CREDIT_ADD_ON: AddOnId = 'tire_shine';

export const PAUSE_RULES = { minWeeks: 1, maxWeeks: 4, cooldownMonths: 3 } as const;

/** Damage must be reported within this many hours of the wash. */
export const DAMAGE_CLAIM_WINDOW_HOURS = 24;

/** A day with this many spots or fewer is shown as "nearly full". */
export const NEARLY_FULL_THRESHOLD = 3;

/** Free weeks for both sides of a referral. */
export const REFERRAL_FREE_WEEKS = 1;

/** Average weeks in a month, used for "≈ EGP X per wash". */
export const WEEKS_PER_MONTH = 52 / 12;

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: 'Card',
  wallet: 'Mobile wallet',
  instapay: 'InstaPay',
  cash: 'Cash',
};
