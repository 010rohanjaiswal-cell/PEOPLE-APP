/**
 * Helpers for job display (Delivery vs standard jobs).
 */

export function isDeliveryCategory(category) {
  return String(category || '')
    .trim()
    .toLowerCase() === 'delivery';
}

/**
 * True if job has delivery-specific fields or category Delivery.
 */
export function isDeliveryJob(job) {
  if (!job) return false;
  if (isDeliveryCategory(job.category)) return true;
  return Boolean(
    job.deliveryToAddress ||
      job.deliveryFromAddress ||
      job.deliveryToPincode ||
      job.deliveryFromPincode
  );
}
