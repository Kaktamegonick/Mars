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
    <group name="perseverance-drive-path">
      <Line
        points={points}
        color="#2c0b03"
        lineWidth={5.4}
        transparent
        opacity={0.7}
        depthTest
      />
      <Line
        points={points}
        color="#ff7845"
        lineWidth={2.4}
        transparent
        opacity={0.98}
        depthTest
      />
      {points.filter((_, index) => index % 7 === 0).map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.007, 10, 8]} />
          <meshBasicMaterial color="#ffe5d4" />
        </mesh>
      ))}
    </group>
  );
}
