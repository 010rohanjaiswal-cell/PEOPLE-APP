/**
 * Open Google Maps directions (default travel mode: bicycling).
 * Origin = job / client side; destination = freelancer current coordinates.
 */

export function buildGoogleMapsBikeDirectionsUrl({
  originLat,
  originLng,
  originQuery,
  destLat,
  destLng,
  destQuery,
  travelmode = 'bicycling',
}) {
  let destParam;
  if (destLat != null && destLng != null) {
    const dlat = Number(destLat);
    const dlng = Number(destLng);
    if (!Number.isNaN(dlat) && !Number.isNaN(dlng)) {
      destParam = `${dlat},${dlng}`;
    }
  }
  if (!destParam && destQuery && String(destQuery).trim()) {
    destParam = String(destQuery).trim();
  }
  if (!destParam) return null;

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
  const dest = encodeURIComponent(destParam);
  const mode = encodeURIComponent(String(travelmode || 'bicycling'));
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${dest}&travelmode=${mode}`;
}
