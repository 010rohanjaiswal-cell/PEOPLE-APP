/**
 * Job categories shown when posting (client) and filtering (freelancer Available Jobs).
 * Values are stored on Job.category as posted by the client.
 */
export const JOB_CATEGORIES = [
  'Delivery',
  'Cooking',
  'Cleaning',
  'Plumbing',
  'Electrical',
  'Mechanic',
  'Driver',
  'Care taker',
  'Tailor',
  'Barber',
  'Laundry',
  'Other',
];

/** Maps category label → postJob.category* i18n key suffix (see en.js postJob). */
export const JOB_CATEGORY_I18N_KEYS = {
  Delivery: 'Delivery',
  Cooking: 'Cooking',
  Cleaning: 'Cleaning',
  Plumbing: 'Plumbing',
  Electrical: 'Electrical',
  Mechanic: 'Mechanic',
  Driver: 'Driver',
  'Care taker': 'CareTaker',
  Tailor: 'Tailor',
  Barber: 'Barber',
  Laundry: 'Laundry',
  Other: 'Other',
};
