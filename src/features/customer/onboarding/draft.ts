import { create } from 'zustand';
import type { AddOnId, CarColor, PaymentMethod, PlanId, Weekday } from '@/types/domain';

/** Answers collected during onboarding. In memory only: nothing is saved until "Subscribe". */
export interface OnboardingDraft {
  phone: string;
  otpVerified: boolean;
  compoundId: string | null;
  name: string;
  building: string;
  apartment: string;
  make: string;
  model: string;
  year: number;
  color: CarColor;
  plate: string;
  zone: string;
  spot: string;
  plan: PlanId | null;
  days: Weekday[];
  addOns: AddOnId[];
  paymentMethod: PaymentMethod;
}

const empty: OnboardingDraft = {
  phone: '10 0000 0123', // demo number, pre-filled so nobody types a real one
  otpVerified: false,
  compoundId: null,
  name: '',
  building: '',
  apartment: '',
  make: '',
  model: '',
  year: 2022,
  color: 'white',
  plate: '',
  zone: '',
  spot: '',
  plan: null,
  days: [],
  addOns: [],
  paymentMethod: 'card',
};

interface DraftStore {
  draft: OnboardingDraft;
  update: (changes: Partial<OnboardingDraft>) => void;
  reset: () => void;
}

export const useOnboardingDraft = create<DraftStore>((set) => ({
  draft: empty,
  update: (changes) => set((s) => ({ draft: { ...s.draft, ...changes } })),
  reset: () => set({ draft: empty }),
}));

/** Screens in order. Letters are sub-screens of the same numbered step. */
export const STEP_ORDER = ['2', '2b', '3', '3b', '4', '4b', '5', '6', '7'] as const;
export type StepId = (typeof STEP_ORDER)[number];
export const TOTAL_STEPS = 7;

export const unitLabel = (d: Pick<OnboardingDraft, 'building' | 'apartment'>) =>
  d.apartment.trim()
    ? `Building ${d.building.trim()}, Apt ${d.apartment.trim()}`
    : `Villa ${d.building.trim()}`;

/** The earliest screen that still needs an answer; guards deep links and reloads. */
export function firstIncompleteStep(d: OnboardingDraft): StepId | null {
  if (!d.otpVerified) return '2';
  if (!d.compoundId) return '3';
  if (!d.name.trim() || !d.building.trim()) return '3b';
  if (!d.make || !d.model) return '4';
  if (!d.zone || !d.spot.trim()) return '4b';
  if (!d.plan) return '5';
  if (d.days.length === 0) return '6';
  return null;
}
