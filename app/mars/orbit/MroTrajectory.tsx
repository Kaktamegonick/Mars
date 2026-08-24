'use client';

import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MARS_RADIUS, METERS_PER_UNIT } from '../utils/coordinates';

const PERIAPSIS = MARS_RADIUS + 255_000 / METERS_PER_UNIT;
const APOAPSIS = MARS_RADIUS + 320_000 / METERS_PER_UNIT;
const INCLINATION = THREE.MathUtils.degToRad(92.7);
const DISPLAY_PERIOD_SECONDS = 18;

function orbitPoint(angle: number) {
  const radius = THREE.MathUtils.lerp(PERIAPSIS, APOAPSIS, (1 - Math.cos(angle)) / 2);
  return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
    .applyAxisAngle(new THREE.Vector3(1, 0, 0), INCLINATION);
}

export function MroTrajectory() {
  const spacecraft = useRef<THREE.Group>(null);
  const points = useMemo(
    () => Array.from({ length: 241 }, (_, index) => orbitPoint((index / 240) * Math.PI * 2)),
    [],
  );

  useFrame(({ clock }) => {
    if (!spacecraft.current) return;
    const angle = ((clock.elapsedTime % DISPLAY_PERIOD_SECONDS) / DISPLAY_PERIOD_SECONDS) * Math.PI * 2;
    spacecraft.current.position.copy(orbitPoint(angle));
    spacecraft.current.lookAt(orbitPoint(angle + 0.025));
  });

  return (
    <group name="mro-reference-orbit">
      <Line
        points={points}
        color="#e86131"
        transparent
        opacity={0.62}
        lineWidth={1}
        dashed
        dashScale={3}
        dashSize={0.12}
        gapSize={0.08}
      />
      <group ref={spacecraft} scale={0.7}>
        <mesh>
          <boxGeometry args={[0.045, 0.03, 0.07]} />
          <meshBasicMaterial color="#f1e8dc" />
        </mesh>
        <mesh position={[0.075, 0, 0]}>
          <boxGeometry args={[0.09, 0.006, 0.045]} />
          <meshBasicMaterial color="#d86a32" />
        </mesh>
        <mesh position={[-0.075, 0, 0]}>
          <boxGeometry args={[0.09, 0.006, 0.045]} />
          <meshBasicMaterial color="#d86a32" />
        </mesh>
        <pointLight color="#e86131" intensity={0.35} distance={0.35} />
      </group>
    </group>
  );
}
