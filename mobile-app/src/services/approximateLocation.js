import * as Location from 'expo-location';

const INDIA_CENTER = { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 8, longitudeDelta: 8 };

/**
 * Rough location without requiring GPS permission: last-known fix, then IP lookup.
 * @returns {Promise<{ lat: number, lng: number, source: string } | null>}
 */
export async function getApproximateLatLng() {
  try {
    const last = await Location.getLastKnownPositionAsync({
      maxAge: 1000 * 60 * 60 * 24,
    });
    const la = last?.coords?.latitude;
    const ln = last?.coords?.longitude;
    if (la != null && ln != null && !Number.isNaN(la) && !Number.isNaN(ln)) {
      return { lat: la, lng: ln, source: 'last_known' };
    }
  } catch (_) {
    /* no permission / no cache */
  }

  const tryIp = async (url, parse) => {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      const data = await res.json();
      return parse(data);
    } finally {
      clearTimeout(tid);
    }
  };

  try {
    const fromIpapi = await tryIp('https://ipapi.co/json/', (data) => {
      if (!data || data.error) return null;
      const lat = Number(data.latitude);
      const lng = Number(data.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
      return { lat, lng, source: 'ip' };
    });
    if (fromIpapi) return fromIpapi;
  } catch (_) {
    /* continue */
  }

  try {
    const fromWho = await tryIp('https://ipwho.is/', (data) => {
      if (!data || data.success !== true) return null;
      const lat = Number(data.latitude);
      const lng = Number(data.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
      return { lat, lng, source: 'ip' };
    });
    if (fromWho) return fromWho;
  } catch (_) {
    /* continue */
  }

  return null;
}

export function defaultIndiaMapRegion() {
  return { ...INDIA_CENTER };
}

export function regionAround(lat, lng, delta = 0.08) {
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}
