/**
 * Job category helpers — align with mobile-app JOB_CATEGORIES + subcategories.
 */

const MAIN_CATEGORIES = [
  'Delivery',
  'Cooking',
  'Cleaning',
  'Plumbing',
  'Electrical',
  'Mechanic',
  'Driver',
  'Care taker',
  'Tailor',
  'Salon',
  'Laundry',
  'Other',
];

const DELIVERY_SUBCATEGORIES = [
  'Two Wheeler',
  'Three Wheeler',
  'Four Wheeler',
  'Heavy Commercial Trucks',
];

const MECHANIC_SUBCATEGORIES = ['Bike', 'Car', 'Three Wheeler Mechanic', 'Trucks'];

const DELIVERY_SUB_SET = new Set(DELIVERY_SUBCATEGORIES.map((s) => s.toLowerCase()));
const MECHANIC_SUB_SET = new Set(MECHANIC_SUBCATEGORIES.map((s) => s.toLowerCase()));
const MAIN_SET = new Set(MAIN_CATEGORIES.map((s) => s.toLowerCase()));

function getParentCategory(category) {
  const s = String(category || '').trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === 'delivery' || DELIVERY_SUB_SET.has(lower)) return 'Delivery';
  if (lower === 'mechanic' || MECHANIC_SUB_SET.has(lower)) return 'Mechanic';
  const main = MAIN_CATEGORIES.find((c) => c.toLowerCase() === lower);
  if (main) return main;
  return 'Other';
}

function jobMatchesPreference(jobCategory, preferenceCategory) {
  const pref = String(preferenceCategory || '').trim();
  if (!pref) return false;
  const job = String(jobCategory || '').trim();
  if (!job) return false;
  if (job.toLowerCase() === pref.toLowerCase()) return true;
  if (isValidMainCategory(pref)) {
    return getParentCategory(job) === pref;
  }
  return false;
}

function isDeliverySubcategory(category) {
  return DELIVERY_SUB_SET.has(String(category || '').trim().toLowerCase());
}

function isMechanicSubcategory(category) {
  return MECHANIC_SUB_SET.has(String(category || '').trim().toLowerCase());
}

function isValidPreferenceCategory(category) {
  const s = String(category || '').trim();
  if (!s) return false;
  if (isValidMainCategory(s)) return true;
  const lower = s.toLowerCase();
  if (DELIVERY_SUB_SET.has(lower) || MECHANIC_SUB_SET.has(lower)) return true;
  if (lower === 'others') return false;
  return s.length >= 2 && s.length <= 200;
}

module.exports = {
  MAIN_CATEGORIES,
  DELIVERY_SUBCATEGORIES,
  MECHANIC_SUBCATEGORIES,
  getParentCategory,
  jobMatchesPreference,
  isValidMainCategory,
  isValidPreferenceCategory,
  isDeliverySubcategory,
  isMechanicSubcategory,
  preferenceDisplayName,
};
