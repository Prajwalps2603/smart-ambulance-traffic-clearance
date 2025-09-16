import axios from "axios";

export type EtaResult = {
  distanceMeters: number;
  etaSeconds: number;
  path?: Array<{ lat: number; lng: number }>;
};

// Haversine distance in meters
export function haversine(a: {lat:number; lng:number}, b: {lat:number; lng:number}) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
  return R * c;
}

// Naive ETA: speed 30 km/h unless provided
export function naiveEta(origin: {lat:number; lng:number}, dest: {lat:number; lng:number}, speedKph = 30): EtaResult {
  const distanceMeters = haversine(origin, dest);
  const metersPerSec = (speedKph * 1000) / 3600;
  const etaSeconds = Math.max(60, Math.round(distanceMeters / Math.max(5, metersPerSec)));
  return { distanceMeters, etaSeconds };
}

export async function directionsEta(origin: {lat:number; lng:number}, dest: {lat:number; lng:number}): Promise<EtaResult> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return naiveEta(origin, dest);
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&mode=driving&key=${key}`;
  const res = await axios.get(url);
  const route = res.data.routes?.[0];
  const leg = route?.legs?.[0];
  if (!leg) return naiveEta(origin, dest);
  const distanceMeters = leg.distance?.value ?? naiveEta(origin, dest).distanceMeters;
  const etaSeconds = leg.duration?.value ?? naiveEta(origin, dest).etaSeconds;
  const path = decodePolyline(route.overview_polyline?.points);
  return { distanceMeters, etaSeconds, path };
}

// Polyline decoding (Google encoded polyline)
function decodePolyline(str: string | undefined): Array<{lat:number; lng:number}> {
  if (!str) return [];
  let index = 0, lat = 0, lng = 0, coordinates: Array<{lat:number; lng:number}> = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coordinates;
}