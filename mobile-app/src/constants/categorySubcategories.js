/**
 * Delivery & Mechanic sub-categories — shown after user picks the parent category.
 */

import { JOB_CATEGORY_I18N_KEYS } from './jobCategories';

export const DELIVERY_SUBCATEGORIES = [
  'Two Wheeler',
  'Three Wheeler',
  'Four Wheeler',
  'Heavy Commercial Trucks',
];

export const MECHANIC_SUBCATEGORIES = ['Bike', 'Car', 'Three Wheeler Mechanic', 'Trucks'];

export const PARENT_CATEGORIES_WITH_SUBS = ['Delivery', 'Mechanic'];

export const SUBCATEGORY_I18N_KEYS = {
  'Two Wheeler': 'SubTwoWheeler',
  'Three Wheeler': 'SubThreeWheeler',
  'Four Wheeler': 'SubFourWheeler',
  'Heavy Commercial Trucks': 'SubHeavyCommercialTrucks',
  Bike: 'SubBike',
  Car: 'SubCar',
  Trucks: 'SubTrucks',
  'Three Wheeler Mechanic': 'SubMechanicThreeWheeler',
};

const SUBCATEGORY_ICONS = {
  'Two Wheeler': require('../../assets/category-icons/subcategories/two-wheeler.png'),
  'Three Wheeler': require('../../assets/category-icons/subcategories/three-wheeler.png'),
  'Four Wheeler': require('../../assets/category-icons/subcategories/car-2.png'),
  'Heavy Commercial Trucks': require('../../assets/category-icons/subcategories/truck.png'),
  Bike: require('../../assets/category-icons/subcategories/mechanic-bike.png'),
  Car: require('../../assets/category-icons/subcategories/mechanic-car.png'),
  Trucks: require('../../assets/category-icons/subcategories/mechanic-trucks.png'),
  'Three Wheeler Mechanic': require('../../assets/category-icons/subcategories/mechanic-three-wheeler.png'),
};

const DELIVERY_SUB_SET = new Set(DELIVERY_SUBCATEGORIES.map((s) => s.toLowerCase()));
const MECHANIC_SUB_SET = new Set(MECHANIC_SUBCATEGORIES.map((s) => s.toLowerCase()));

export function getSubcategoriesForParent(parent) {
  if (parent === 'Delivery') return DELIVERY_SUBCATEGORIES;
  if (parent === 'Mechanic') return MECHANIC_SUBCATEGORIES;
  return [];
}

export function isDeliverySubcategory(category) {
  const s = String(category || '').trim().toLowerCase();
  return s === 'delivery' || DELIVERY_SUB_SET.has(s);
}

export function isMechanicSubcategory(category) {
  const s = String(category || '').trim().toLowerCase();
  return s === 'mechanic' || MECHANIC_SUB_SET.has(s);
}

export function getSubcategoryParent(category) {
  const s = String(category || '').trim();
  if (DELIVERY_SUBCATEGORIES.includes(s)) return 'Delivery';
  if (MECHANIC_SUBCATEGORIES.includes(s)) return 'Mechanic';
  return null;
}

export function isParentCategoryWithSubs(category) {
  return PARENT_CATEGORIES_WITH_SUBS.includes(String(category || '').trim());
}

export function iconForSubcategory(category) {
  return SUBCATEGORY_ICONS[String(category || '').trim()] || null;
}

function withMechanicSuffix(t, label) {
  const mechanic = String(t('postJob.categoryMechanic') || 'Mechanic').trim();
  const base = String(label || '').trim();
  if (!base || !mechanic) return base;
  if (base.toLowerCase().includes(mechanic.toLowerCase())) return base;
  return `${base} ${mechanic}`;
}

export function labelForJobCategory(t, category) {
  const s = String(category || '').trim();
  if (!s) return '';
  const subKey = SUBCATEGORY_I18N_KEYS[s];
  if (subKey) {
    const label = t('postJob.category' + subKey);
    if (MECHANIC_SUBCATEGORIES.includes(s)) return withMechanicSuffix(t, label);
    return label;
  }
  const keySuffix = JOB_CATEGORY_I18N_KEYS?.[s];
  if (keySuffix) return t('postJob.category' + keySuffix);
  return s;
}

export function categoryMatchesFilter(jobCategory, filterCategory) {
  const job = String(jobCategory || '').trim().toLowerCase();
  const filter = String(filterCategory || '').trim().toLowerCase();
  if (!filter) return true;
  if (job === filter) return true;
  if (filter === 'delivery' && DELIVERY_SUB_SET.has(job)) return true;
  if (filter === 'mechanic' && MECHANIC_SUB_SET.has(job)) return true;
  return false;
}

export function isSubcategoryFilterActive(filters, parent) {
  const subs = getSubcategoriesForParent(parent);
  return subs.some((sub) => filters.includes(sub));
}
