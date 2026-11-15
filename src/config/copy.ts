/** Shared labels and short copy used by more than one screen. */
import type { IssueStatus, IssueType, WashType } from '@/types/domain';

export const RATING_TAGS = {
  positive: ['Spotless', 'On time', 'Friendly'],
  negative: ['Missed a spot', 'Late', 'Water marks', 'Interior not cleaned'],
} as const;

export const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  missed_wash: 'Missed wash',
  quality: 'Wash quality',
  damage: 'Damage',
  billing: 'Billing',
  other: 'Something else',
};

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  resolved: 'Resolved',
};

export const WASH_TYPE_LABEL: Record<WashType, string> = {
  exterior: 'Exterior wash',
  exterior_interior: 'Exterior + interior',
};
