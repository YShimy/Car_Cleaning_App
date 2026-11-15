import type { BodyType, CarColor } from '@/types/domain';

export interface CarModel {
  make: string;
  model: string;
  bodyType: BodyType;
}

/** Common models in Egypt. */
export const CAR_MODELS: CarModel[] = [
  { make: 'Hyundai', model: 'Elantra', bodyType: 'sedan' },
  { make: 'Hyundai', model: 'Tucson', bodyType: 'suv' },
  { make: 'Hyundai', model: 'i10', bodyType: 'hatchback' },
  { make: 'Kia', model: 'Sportage', bodyType: 'suv' },
  { make: 'Kia', model: 'Cerato', bodyType: 'sedan' },
  { make: 'Kia', model: 'Picanto', bodyType: 'hatchback' },
  { make: 'Nissan', model: 'Sunny', bodyType: 'sedan' },
  { make: 'Nissan', model: 'Qashqai', bodyType: 'suv' },
  { make: 'Toyota', model: 'Corolla', bodyType: 'sedan' },
  { make: 'Toyota', model: 'Hilux', bodyType: 'pickup' },
  { make: 'MG', model: 'ZS', bodyType: 'suv' },
  { make: 'MG', model: '5', bodyType: 'sedan' },
  { make: 'Chery', model: 'Tiggo 7', bodyType: 'suv' },
  { make: 'Mercedes', model: 'C-Class', bodyType: 'sedan' },
  { make: 'BMW', model: 'X3', bodyType: 'suv' },
  { make: 'Skoda', model: 'Octavia', bodyType: 'sedan' },
  { make: 'Peugeot', model: '3008', bodyType: 'suv' },
  { make: 'Chevrolet', model: 'Optra', bodyType: 'sedan' },
  { make: 'Jeep', model: 'Compass', bodyType: 'suv' },
  { make: 'Renault', model: 'Sandero', bodyType: 'hatchback' },
  { make: 'Mitsubishi', model: 'L200', bodyType: 'pickup' },
];

export const CAR_MAKES = [...new Set(CAR_MODELS.map((m) => m.make))];

export const CAR_COLORS: CarColor[] = [
  'white',
  'silver',
  'black',
  'grey',
  'dark_blue',
  'red',
  'beige',
];

export const CAR_COLOR_LABEL: Record<CarColor, string> = {
  white: 'White',
  silver: 'Silver',
  black: 'Black',
  grey: 'Grey',
  dark_blue: 'Dark blue',
  red: 'Red',
  beige: 'Beige',
};

/** Paint colours used by the SVG illustration and the colour swatches. */
export const CAR_COLOR_HEX: Record<CarColor, string> = {
  white: '#f4f5f7',
  silver: '#c3c8cf',
  black: '#23272e',
  grey: '#6f7780',
  dark_blue: '#1f3a63',
  red: '#b3261e',
  beige: '#d9c7a3',
};

/** Relative popularity, for the generator. */
export const CAR_COLOR_WEIGHTS: [CarColor, number][] = [
  ['white', 30],
  ['silver', 20],
  ['black', 16],
  ['grey', 14],
  ['dark_blue', 8],
  ['red', 7],
  ['beige', 5],
];

export const carLabel = (car: { make: string; model: string }) => `${car.make} ${car.model}`;

/** Body type for a make/model; defaults to sedan for the live preview. */
export const bodyTypeOf = (make: string, model: string): BodyType =>
  CAR_MODELS.find((m) => m.make === make && m.model === model)?.bodyType ?? 'sedan';
