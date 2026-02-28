/**
 * Location Service - People App Backend
 * Pincode → state (India) and reverse geocode (lat/lng → state)
 */

const axios = require('axios');

const PINCODE_API = 'https://api.postalpincode.in/pincode';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

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
    const { data } = await axios.get(NOMINATIM_URL, {
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

module.exports = {
  getStateFromPincode,
  getStateFromCoords,
  normalizeState,
};
