/**
 * Real photos, when you have them.
 *
 * By default every before/after "photo" is a generated illustration.
 * To use real photos for a car, put the files in `public/photos/` and
 * list them here, keyed by car id (e.g. "car_nour"):
 *
 *   car_nour: { before: 'photos/car_nour-before.jpg', after: 'photos/car_nour-after.jpg' },
 */
export const PHOTO_OVERRIDES: Record<string, { before?: string; after?: string }> = {};
