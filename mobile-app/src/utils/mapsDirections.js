/**
 * Open Google Maps directions (default travel mode: bicycling).
 * Origin = job / client side; destination = freelancer current coordinates.
 */

export function buildGoogleMapsBikeDirectionsUrl({ originLat, originLng, originQuery, destLat, destLng }) {
  const d = `${Number(destLat)},${Number(destLng)}`;
  let originParam;
  if (originLat != null && originLng != null) {
    const olat = Number(originLat);
    const olng = Number(originLng);
    if (!Number.isNaN(olat) && !Number.isNaN(olng)) {
      originParam = `${olat},${olng}`;
    }
  }
  if (!originParam && originQuery && String(originQuery).trim()) {
    originParam = String(originQuery).trim();
  }
  if (!originParam) return null;
  const o = encodeURIComponent(originParam);
  const dest = encodeURIComponent(d);
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${dest}&travelmode=bicycling`;
}
