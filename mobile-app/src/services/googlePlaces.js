import Constants from 'expo-constants';

function getGoogleMapsApiKey() {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    Constants.expoConfig?.extra?.googleMapsApiKey ||
    Constants.manifest?.extra?.googleMapsApiKey ||
    null
  );
}

export function hasGoogleMapsApiKey() {
  return Boolean(getGoogleMapsApiKey());
}

function buildUrl(base, params) {
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    usp.append(k, String(v));
  });
  return `${base}?${usp.toString()}`;
}

export async function placesAutocomplete({
  input,
  sessionToken,
  language = 'en',
  country = 'in',
  /** Optional bias toward user area (e.g. from IP / last-known), in meters */
  locationBiasLat,
  locationBiasLng,
  locationBiasRadiusM = 80000,
}) {
  const key = getGoogleMapsApiKey();
  if (!key) throw new Error('Google Maps API key not configured');
  const hasBias =
    locationBiasLat != null &&
    locationBiasLng != null &&
    !Number.isNaN(Number(locationBiasLat)) &&
    !Number.isNaN(Number(locationBiasLng));
  const url = buildUrl('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
    input,
    key,
    language,
    components: country ? `country:${country}` : undefined,
    sessiontoken: sessionToken,
    ...(hasBias
      ? {
          location: `${Number(locationBiasLat)},${Number(locationBiasLng)}`,
          radius: String(Math.min(Math.max(Number(locationBiasRadiusM) || 80000, 1000), 50000)),
        }
      : {}),
  });
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Places autocomplete failed: ${data.status}`);
  }
  return data.predictions || [];
}

export async function placeDetails({ placeId, sessionToken, language = 'en' }) {
  const key = getGoogleMapsApiKey();
  if (!key) throw new Error('Google Maps API key not configured');
  const url = buildUrl('https://maps.googleapis.com/maps/api/place/details/json', {
    place_id: placeId,
    key,
    language,
    sessiontoken: sessionToken,
    fields: 'formatted_address,name,geometry,address_component',
  });
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status !== 'OK') {
    throw new Error(data.error_message || `Place details failed: ${data.status}`);
  }
  return data.result;
}

export function extractPincodeFromAddressComponents(components) {
  const list = Array.isArray(components) ? components : [];
  const postal = list.find((c) => Array.isArray(c.types) && c.types.includes('postal_code'));
  const pin = postal?.long_name || postal?.short_name;
  const cleaned = String(pin || '').replace(/\D/g, '').slice(0, 6);
  return cleaned.length === 6 ? cleaned : null;
}

export async function reverseGeocode({ lat, lng, language = 'en' }) {
  const key = getGoogleMapsApiKey();
  if (!key) throw new Error('Google Maps API key not configured');
  const url = buildUrl('https://maps.googleapis.com/maps/api/geocode/json', {
    latlng: `${lat},${lng}`,
    key,
    language,
    result_type: 'street_address|premise|subpremise|route|sublocality|locality|administrative_area_level_3|administrative_area_level_2|administrative_area_level_1|postal_code',
  });
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Reverse geocode failed: ${data.status}`);
  }
  const first = Array.isArray(data.results) ? data.results[0] : null;
  if (!first) return null;
  return first;
}

