'use client';

import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { getRoverStation } from '../data/roverStations';
import { PERSEVERANCE_ROUTE } from '../data/perseveranceRoute';
import { useMarsStore } from '../stores/marsStore';
import { MARS_RADIUS } from '../utils/coordinates';

function routePosition(latitude: number, longitude: number) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const theta = THREE.MathUtils.degToRad(longitude + 90);
  const radius = MARS_RADIUS + 0.052;
  const horizontal = Math.cos(lat) * radius;
  return new THREE.Vector3(
    Math.cos(theta) * horizontal,
    Math.sin(lat) * radius,
    Math.sin(theta) * horizontal,
  );
}

export function RoverRoutePath() {
  const activeStationId = useMarsStore((state) => state.activeStationId);
  const activeStation = getRoverStation(activeStationId);
  const points = useMemo(
    () => activeStation.rover === 'Perseverance'
      ? PERSEVERANCE_ROUTE.map(([latitude, longitude]) => routePosition(latitude, longitude))
      : [],
    [activeStation.rover],
  );

  if (points.length < 2) return null;
  return (
    <Line
      points={points}
      color="#ff7845"
      lineWidth={1.6}
      transparent
      opacity={0.78}
      depthTest
    />
  );
}
