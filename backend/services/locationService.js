/**
 * Location Service - People App Backend
 * Pincode → state (India) and reverse geocode (lat/lng → state)
 */

const axios = require('axios');

const PINCODE_API = 'https://api.postalpincode.in/pincode';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

/** Nominatim allows 1 request per second. We throttle to avoid 429 / empty responses. */
let lastNominatimCall = 0;
const NOMINATIM_MIN_INTERVAL_MS = 1100;

function waitForNominatimRateLimit() {
  const now = Date.now();
  const elapsed = now - lastNominatimCall;
  if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
    return new Promise((resolve) =>
      setTimeout(resolve, NOMINATIM_MIN_INTERVAL_MS - elapsed)
    );
  }
  return Promise.resolve();
}

/** Normalize state name for consistent comparison (lowercase, trim) */
function normalizeState(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase();
}

/**
 * Get state (and optionally district) from Indian pincode
 * Uses api.postalpincode.in
 * @param {string} pincode - 6-digit Indian pincode
 * @returns {Promise<{ state: string, district?: string }|null>}
 */
async function getStateFromPincode(pincode) {
  const pin = String(pincode).trim();
  if (!pin || pin.length !== 6) return null;
  try {
    const { data } = await axios.get(`${PINCODE_API}/${pin}`, { timeout: 8000 });
    const first = Array.isArray(data) && data[0];
    if (!first || first.Status !== 'Success' || !first.PostOffice || first.PostOffice.length === 0)
      return null;
    const state = first.PostOffice[0].State;
    const district = first.PostOffice[0].District;
    return {
      state: state ? normalizeState(state) : '',
      district: district ? String(district).trim() : undefined,
    };
  } catch (err) {
    console.error('locationService getStateFromPincode:', err.message);
    return null;
  }
}

/**
 * Get state from lat/lng (reverse geocode) for India
 * Uses Nominatim (OpenStreetMap). Be respectful with rate limits (1 req/sec).
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string|null>} Normalized state name or null
 */
async function getStateFromCoords(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  try {
    await waitForNominatimRateLimit();
    lastNominatimCall = Date.now();
    const { data } = await axios.get(NOMINATIM_REVERSE, {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
      },
      headers: { 'User-Agent': 'PeopleApp/1.0' },
      timeout: 8000,
    });
    if (!data || !data.address) return null;
    const addr = data.address;
    // Nominatim: state can be in state or state_district (India)
    const state = addr.state || addr.state_district || addr.region || '';
    return state ? normalizeState(state) : null;
  } catch (err) {
    console.error('locationService getStateFromCoords:', err.message);
    return null;
  }
}

/**
 * Get approximate lat/lng for an Indian pincode (for distance calculation)
 * Uses Nominatim search. Rate limit: 1 req/sec.
 * @param {string} pincode - 6-digit Indian pincode
 * @returns {Promise<{ lat: number, lng: number }|null>}
 */
async function getCoordsFromPincode(pincode) {
  const pin = String(pincode).trim();
  if (!pin || pin.length !== 6) return null;
  try {
    await waitForNominatimRateLimit();
    lastNominatimCall = Date.now();
    const { data } = await axios.get(NOMINATIM_SEARCH, {
      params: {
        postalcode: pin,
        country: 'India',
        format: 'json',
        limit: 1,
      },
      headers: { 'User-Agent': 'PeopleApp/1.0' },
      timeout: 8000,
    });
    const first = Array.isArray(data) && data[0];
    if (!first || first.lat == null || first.lon == null) return null;
    return {
      lat: Number(first.lat),
      lng: Number(first.lon),
    };
  } catch (err) {
    console.error('locationService getCoordsFromPincode:', err.message);
    return null;
  }
}

/**
 * Haversine distance in km between two points
 */
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  getStateFromPincode,
  getStateFromCoords,
  getCoordsFromPincode,
  haversineDistanceKm,
  normalizeState,
};
