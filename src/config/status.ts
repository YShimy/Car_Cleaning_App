/** Label and colour for each status, shared by the customer and admin views. */
import type { Tone } from '@/components/ui/StatusChip';
import type { Compound, IssueStatus, Payment, SubscriptionStatus } from '@/types/domain';

export const SUB_STATUS: Record<SubscriptionStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'success' },
  paused: { label: 'Paused', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  pending_payment: { label: 'Pending payment', tone: 'info' },
};

export const PAYMENT_STATUS: Record<Payment['status'], { label: string; tone: Tone }> = {
  paid: { label: 'Paid', tone: 'success' },
  due: { label: 'Due', tone: 'warning' },
  overdue: { label: 'Overdue', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export const COMPOUND_STATUS: Record<Compound['status'], { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'success' },
  pilot: { label: 'Pilot', tone: 'info' },
  onboarding: { label: 'Onboarding', tone: 'neutral' },
};

export const ISSUE_TONE: Record<IssueStatus, Tone> = {
  submitted: 'neutral',
  under_review: 'info',
  resolved: 'success',
};
