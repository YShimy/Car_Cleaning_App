export type ID = string;

export type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export type PlanId = 'essential' | 'plus' | 'premium';
export type AddOnId = 'deep_interior' | 'wax_polish' | 'tire_shine' | 'seat_shampoo';
export type CarColor = 'white' | 'silver' | 'black' | 'grey' | 'dark_blue' | 'red' | 'beige';
export type BodyType = 'sedan' | 'hatchback' | 'suv' | 'pickup';
export type PaymentMethod = 'card' | 'wallet' | 'instapay' | 'cash';
export type Role = 'customer' | 'washer' | 'admin' | 'manager';

/** ISO calendar date, e.g. "2026-11-17". */
export type ISODate = string;
/** ISO date-time, e.g. "2026-11-17T09:05:00.000Z". */
export type ISODateTime = string;

export interface Compound {
  id: ID;
  name: string; // fictional
  area: string;
  serviceDays: Weekday[]; // exactly 2
  washerIds: ID[]; // 1–3
  parkingZones: string[];
  managerName: string; // fictional
  partnershipSince: ISODate;
  status: 'active' | 'pilot' | 'onboarding';
}

export interface Washer {
  id: ID;
  name: string;
  phone: string; // obviously fake format
  photoInitials: string; // avatar uses initials, no real faces
  idVerified: boolean;
  joinedAt: ISODate;
  rating: number;
  compoundIds: ID[];
}

export interface Customer {
  id: ID;
  name: string;
  phone: string;
  compoundId: ID;
  unit: string;
  referralCode: string;
  referredBy?: ID;
  joinedAt: ISODate;
  notificationPrefs: { whatsapp: boolean; push: boolean };
  /** Free tire-shine credits earned by skipping washes (PLAN.md 4.4). */
  addOnCredits: number;
}

export interface Car {
  id: ID;
  customerId: ID;
  make: string;
  model: string;
  year: number;
  color: CarColor;
  plate: string;
  bodyType: BodyType;
  parkingZone: string;
  parkingSpot: string;
  notes?: string;
}

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'pending_payment';

export interface Subscription {
  id: ID;
  customerId: ID;
  carId: ID;
  /** Denormalised from the customer so capacity checks need no join. */
  compoundId: ID;
  plan: PlanId;
  weeklyDays: Weekday[]; // 1 day, or 2 for premium
  status: SubscriptionStatus;
  startedAt: ISODate;
  pausedUntil?: ISODate;
  /** When the most recent pause started; enforces "once per 3 months". */
  lastPausedAt?: ISODate;
  /** Date the cancellation takes (or took) effect. */
  cancelAt?: ISODate;
  cancelReason?: string;
  /** Days the billing cycle has been pushed back by pauses. */
  billingShiftDays?: number;
  /** A day change requested by the customer; applies from next week. */
  pendingDayChange?: { from: Weekday; to: Weekday; effectiveFrom: ISODate };
  monthlyPrice: number; // after family discount
  paymentMethod: PaymentMethod;
}

export type WashStatus =
  | 'scheduled'
  | 'washer_on_site'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'missed'
  | 'weather_delayed';

export type WashType = 'exterior' | 'exterior_interior';

export type ChecklistItem =
  | 'exterior_body'
  | 'windows'
  | 'wheels_rims'
  | 'mirrors'
  | 'interior_vacuum'
  | 'dashboard'
  | 'floor_mats'
  | 'photos_taken';

export interface WashRating {
  stars: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  comment?: string;
}

export interface DamageMarker {
  /** Position on the car outline, 0–100 (percent). */
  x: number;
  y: number;
  note: string;
}

export interface Wash {
  id: ID;
  subscriptionId: ID;
  carId: ID;
  customerId: ID;
  compoundId: ID;
  washerId: ID;
  scheduledDate: ISODate;
  type: WashType;
  addOns: AddOnId[];
  status: WashStatus;
  arrivedAt?: ISODateTime;
  startedAt?: ISODateTime;
  completedAt?: ISODateTime;
  beforePhotoSeed?: number; // drives the SVG illustration
  afterPhotoSeed?: number;
  /** Only stored while a wash is in flight; completed washes imply all items done. */
  checklist?: Partial<Record<ChecklistItem, boolean>>;
  rating?: WashRating;
  washerNote?: string;
  damageMarkers?: DamageMarker[];
  skipReason?: 'customer' | 'car_not_found' | 'car_covered';
  /** Weather delay: the date this wash was moved to / moved from. */
  rescheduledTo?: ISODate;
  rescheduledFrom?: ISODate;
}

export interface Payment {
  id: ID;
  customerId: ID;
  subscriptionId?: ID;
  amount: number;
  method: PaymentMethod;
  status: 'paid' | 'due' | 'overdue' | 'refunded';
  date: ISODate;
  description: string;
}

export type IssueType = 'missed_wash' | 'quality' | 'damage' | 'billing' | 'other';
export type IssueStatus = 'submitted' | 'under_review' | 'resolved';

export interface Issue {
  id: ID;
  customerId: ID;
  washId?: ID;
  compoundId: ID;
  type: IssueType;
  description: string;
  status: IssueStatus;
  createdAt: ISODateTime;
  resolvedAt?: ISODateTime;
  resolutionNote?: string;
}

export type NotificationKind =
  'reminder' | 'washer_on_site' | 'wash_done' | 'payment' | 'issue_update' | 'promo';

export interface Notification {
  id: ID;
  customerId: ID;
  createdAt: ISODateTime;
  read: boolean;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string;
}

export interface Session {
  role: Role;
  /** Logged-in customer persona; null means "new customer" (onboarding). */
  customerId: ID | null;
  washerId: ID;
  managerCompoundId: ID | null;
  presentationMode: boolean;
  /** True while a "Start as a new customer" interview is being recorded. */
  interviewMode: boolean;
}

/** Everything the generator produces and the store persists. */
export interface DemoData {
  generatedOn: ISODate;
  compounds: Compound[];
  washers: Washer[];
  customers: Customer[];
  cars: Car[];
  subscriptions: Subscription[];
  washes: Wash[];
  payments: Payment[];
  issues: Issue[];
  notifications: Notification[];
}
