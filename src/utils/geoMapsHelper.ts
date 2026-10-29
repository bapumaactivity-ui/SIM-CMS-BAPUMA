// Utility for School Location Coordinates, Distance (Haversine), and Google Maps URL parsing

export const DEFAULT_SCHOOL_LAT = -6.3463444;
export const DEFAULT_SCHOOL_LNG = 106.57316;
export const DEFAULT_GATE_LAT = -6.3464973;
export const DEFAULT_GATE_LNG = 106.5730419;

// Kampus Jl. Sumantri No. 11 RT 03/05 Parungpanjang (Data Resmi Dapodik / Kemendikdasmen)
export const DEFAULT_SUMANTRI_LAT = -6.3439000;
export const DEFAULT_SUMANTRI_LNG = 106.5685000;
export const DEFAULT_SUMANTRI_GATE_LAT = -6.3438100;
export const DEFAULT_SUMANTRI_GATE_LNG = 106.5687000;

// Radius default 250 meter menjamin keterjangkauan seluruh area ruang kelas, lab farmasi/keperawatan, lapangan, dan gerbang sekolah
export const DEFAULT_RADIUS_METERS = 250;
export const DEFAULT_MAPS_URL = 'https://maps.app.goo.gl/845UtAVRFmNoEVvSA';
export const DEFAULT_SCHOOL_PLACE = 'SMK KESEHATAN BAKTI PUTRA MANDIRI';

/**
 * Calculates geodesic distance between two points in meters using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (val: number) => (val * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Returns minimum distance to school target point, campus buildings or perimeter gates
 */
export function getDistanceToSchoolMeters(
  userLat: number, 
  userLon: number, 
  targetLat: number = DEFAULT_SCHOOL_LAT, 
  targetLon: number = DEFAULT_SCHOOL_LNG
): number {
  const distPrimary = calculateDistanceMeters(userLat, userLon, targetLat, targetLon);
  const distGate = calculateDistanceMeters(userLat, userLon, DEFAULT_GATE_LAT, DEFAULT_GATE_LNG);
  const distCampusPin = calculateDistanceMeters(userLat, userLon, DEFAULT_SCHOOL_LAT, DEFAULT_SCHOOL_LNG);
  const distSumantri = calculateDistanceMeters(userLat, userLon, DEFAULT_SUMANTRI_LAT, DEFAULT_SUMANTRI_LNG);
  const distSumantriGate = calculateDistanceMeters(userLat, userLon, DEFAULT_SUMANTRI_GATE_LAT, DEFAULT_SUMANTRI_GATE_LNG);
  
  return Math.min(distPrimary, distGate, distCampusPin, distSumantri, distSumantriGate);
}

/**
 * Calculates effective distance considering GPS device accuracy margin.
 * Handheld mobile phones indoors/classrooms often report accuracy between ±15m to ±50m.
 */
export function getEffectiveDistanceMeters(rawDistance: number, accuracy: number = 0): number {
  if (accuracy <= 0) return rawDistance;
  const tolerance = Math.min(accuracy * 0.5, 60);
  return Math.max(0, rawDistance - tolerance);
}

/**
 * Smart extractor of Latitude and Longitude from various Google Maps URLs or strings:
 * - https://www.google.com/maps/place/.../@-6.3463444,106.57316,55m/...
 * - !3d-6.3463444!4d106.57316
 * - https://maps.google.com/?q=-6.3463444,106.57316
 * - "-6.3463444, 106.57316"
 */
export function parseGoogleMapsCoords(input: string): { latitude: number; longitude: number } | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Pattern 1: @lat,lng (e.g. /@ -6.3463444,106.57316)
  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // Pattern 2: !3d<lat>!4d<lng>
  const dataMatch = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // Pattern 3: query parameters ?q=lat,lng or &q=lat,lng or ll=lat,lng
  const qMatch = trimmed.match(/[?&](?:q|ll|query|saddr|daddr)=(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // Pattern 4: Plain comma-separated "lat, lng" (e.g., "-6.3463444, 106.57316")
  const plainMatch = trimmed.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (plainMatch) {
    const lat = parseFloat(plainMatch[1]);
    const lng = parseFloat(plainMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  return null;
}
