/**
 * Post Job category picker layout — main categories + rotating sub-categories on last row.
 */

export const CATEGORY_PICKER_TILES = [
  { type: 'main', key: 'Delivery' },
  { type: 'main', key: 'Cooking' },
  { type: 'main', key: 'Cleaning' },
  { type: 'main', key: 'Plumbing' },
  { type: 'main', key: 'Electrical' },
  { type: 'main', key: 'Mechanic' },
  { type: 'main', key: 'Driver' },
  { type: 'main', key: 'Care taker' },
  { type: 'main', key: 'Other' },
];

/** Last row: all three tiles rotate through Other sub-categories. */
export const CATEGORY_PICKER_LAST_ROW_TILES = [
  { type: 'rotating', slot: 0, originalCategory: 'Salon' },
  { type: 'rotating', slot: 1, originalCategory: 'Laundry' },
  { type: 'rotating', slot: 2, originalCategory: 'Tailor' },
];

/** When each last-row tile (10th, 11th, 12th) starts rotating after Post Job is opened. */
export const LAST_ROW_ROTATION_START_DELAYS_MS = [4000, 5000, 6000];

export const ROTATION_HOLD_MS = 6000;
