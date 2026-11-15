import type { Compound, Weekday } from '@/types/domain';

export interface CompoundSeed {
  id: string;
  name: string;
  area: string;
  serviceDays: [Weekday, Weekday];
  status: Compound['status'];
  /** Indexes into the washer list. */
  washers: number[];
  parkingZones: string[];
  /** How long ago the partnership started; drives the subscriber growth curve. */
  launchedDaysAgo: number;
  /**
   * Spots deliberately left free on each service day, so the demo always
   * shows one "nearly full" day and one "full" day. Omitted = random slack.
   */
  spotsLeft?: [number, number];
}

/**
 * Ten FICTIONAL compounds. Do not replace with real compound or developer
 * names: the demo must not imply partnerships that do not exist.
 *
 * Each washer covers two compounds whose service days never overlap.
 */
export const COMPOUND_SEEDS: CompoundSeed[] = [
  {
    id: 'cmp_palm',
    name: 'Palm Grove Residence',
    area: 'New Cairo',
    serviceDays: ['tue', 'sat'],
    status: 'active',
    washers: [0, 1],
    parkingZones: ['Basement B1', 'Basement B2', 'Zone A villas'],
    launchedDaysAgo: 215,
    spotsLeft: [6, 2],
  },
  {
    id: 'cmp_cedar',
    name: 'Cedar Heights',
    area: 'New Cairo',
    serviceDays: ['sun', 'wed'],
    status: 'active',
    washers: [0, 2],
    parkingZones: ['Basement B1', 'Basement B2', 'Surface parking'],
    launchedDaysAgo: 200,
    spotsLeft: [0, 5],
  },
  {
    id: 'cmp_lotus',
    name: 'Lotus Gardens',
    area: 'New Cairo',
    serviceDays: ['mon', 'thu'],
    status: 'active',
    washers: [1, 2],
    parkingZones: ['Garden villas', 'Lake villas', 'Clubhouse parking'],
    launchedDaysAgo: 172,
  },
  {
    id: 'cmp_oasis',
    name: 'Oasis Park',
    area: 'Sheikh Zayed',
    serviceDays: ['tue', 'fri'],
    status: 'active',
    washers: [3, 4],
    parkingZones: ['Basement P1', 'Basement P2'],
    launchedDaysAgo: 150,
  },
  {
    id: 'cmp_jasmine',
    name: 'Jasmine Hills',
    area: 'Sheikh Zayed',
    serviceDays: ['sat', 'wed'],
    status: 'active',
    washers: [3, 5],
    parkingZones: ['Hill villas', 'Townhouses', 'Visitor parking'],
    launchedDaysAgo: 128,
  },
  {
    id: 'cmp_olive',
    name: 'Olive Court',
    area: 'Sheikh Zayed',
    serviceDays: ['sun', 'thu'],
    status: 'active',
    washers: [4, 5],
    parkingZones: ['Basement B1', 'Courtyard parking'],
    launchedDaysAgo: 106,
  },
  {
    id: 'cmp_sycamore',
    name: 'Sycamore Square',
    area: '6th of October',
    serviceDays: ['mon', 'fri'],
    status: 'active',
    washers: [6, 7],
    parkingZones: ['North garage', 'South garage'],
    launchedDaysAgo: 88,
  },
  {
    id: 'cmp_nile',
    name: 'Nile Crest',
    area: '6th of October',
    serviceDays: ['tue', 'sat'],
    status: 'active',
    washers: [6, 7],
    parkingZones: ['Basement B1', 'Basement B2', 'Crest villas'],
    launchedDaysAgo: 72,
  },
  {
    id: 'cmp_amber',
    name: 'Amber Villas',
    area: 'New Cairo',
    serviceDays: ['wed', 'sat'],
    status: 'pilot',
    washers: [8],
    parkingZones: ['Phase 1 villas', 'Phase 2 villas'],
    launchedDaysAgo: 40,
  },
  {
    id: 'cmp_willow',
    name: 'Willow Bay',
    area: 'Sheikh Zayed',
    serviceDays: ['sun', 'thu'],
    status: 'onboarding',
    washers: [8],
    parkingZones: ['Bay villas', 'Marina apartments'],
    launchedDaysAgo: 10,
  },
];
