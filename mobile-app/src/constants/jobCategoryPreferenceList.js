/**
 * Flat list of all job categories + subcategories for freelancer preference picker.
 */

import { JOB_CATEGORIES } from './jobCategories';
import { getSubcategoriesForParent } from './categorySubcategories';
import { OTHER_SUBCATEGORIES } from './otherWorkOptions';

const PARENTS_WITH_SUBS = new Set(['Delivery', 'Mechanic']);

export function buildJobCategoryPreferenceList() {
  const items = [];

  for (const cat of JOB_CATEGORIES) {
    if (PARENTS_WITH_SUBS.has(cat)) {
      items.push({ value: cat, isSub: false, section: cat });
      for (const sub of getSubcategoriesForParent(cat)) {
        items.push({ value: sub, isSub: true, section: cat });
      }
      continue;
    }
    if (cat === 'Other') {
      for (const sub of OTHER_SUBCATEGORIES) {
        items.push({ value: sub, isSub: false, section: null });
      }
      continue;
    }
    items.push({ value: cat, isSub: false, section: null });
  }

  return items;
}

export function filterJobCategoryPreferenceList(items, query, getLabel) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return items;

  const matchingValues = new Set();
  for (const item of items) {
    const label = String(getLabel(item.value) || '').toLowerCase();
    const value = String(item.value || '').toLowerCase();
    if (label.includes(q) || value.includes(q)) {
      matchingValues.add(item.value);
    }
  }

  const visibleSections = new Set();
  for (const item of items) {
    if (item.isSub && matchingValues.has(item.value) && item.section) {
      visibleSections.add(item.section);
    }
  }

  return items.filter((item) => {
    if (matchingValues.has(item.value)) return true;
    if (!item.isSub && item.section && visibleSections.has(item.value)) return true;
    return false;
  });
}
