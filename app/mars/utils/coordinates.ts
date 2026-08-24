import * as THREE from 'three';

export const MARS_RADIUS = 3.4;
export const METERS_PER_UNIT = 1_000_000;
export const RELIEF_EXAGGERATION = 4;
export const DISPLACEMENT_UNITS = 0.12;

export function cartesianToMars(point: THREE.Vector3) {
  const radius = point.length();
  const latitude = THREE.MathUtils.radToDeg(Math.asin(point.y / radius));
  const longitude = ((THREE.MathUtils.radToDeg(Math.atan2(point.z, point.x)) + 450) % 360) - 180;
  const exaggeratedMeters = (radius - MARS_RADIUS) * METERS_PER_UNIT;
  const elevation = exaggeratedMeters / RELIEF_EXAGGERATION;
  return { latitude, longitude, elevation };
}

export function formatLatitude(value: number) {
  return `${Math.abs(value).toFixed(3)}° ${value >= 0 ? 'N' : 'S'}`;
}

export function formatLongitude(value: number) {
  return `${Math.abs(value).toFixed(3)}° ${value >= 0 ? 'E' : 'W'}`;
}

export function formatDistance(meters: number) {
  if (meters >= 1_000_000) return `${(meters / 1_000_000).toFixed(2)} Mm`;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.max(0, meters).toFixed(meters < 10 ? 1 : 0)} m`;
}

export function formatElevation(meters: number) {
  const sign = meters < 0 ? '−' : '+';
  return `${sign}${formatDistance(Math.abs(meters))}`;
}

export function cameraMode(altitudeMeters: number) {
  if (altitudeMeters > 10_000) return 'ORBITAL';
  if (altitudeMeters > 1_000) return 'REGIONAL';
  if (altitudeMeters > 100) return 'EXPLORE';
  if (altitudeMeters > 10) return 'SURFACE';
  return 'GROUND';
}
