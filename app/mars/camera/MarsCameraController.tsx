import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useMarsStore } from '../stores/marsStore';
import { cameraMode, cartesianToMars, DISPLACEMENT_UNITS, MARS_RADIUS, METERS_PER_UNIT } from '../utils/coordinates';

const ORBITAL_DESCENT_LIMIT = 320_000;
const MINIMUM_ORBIT_RADIUS = MARS_RADIUS + ORBITAL_DESCENT_LIMIT / METERS_PER_UNIT;

type ActiveFlight = {
  key: number;
  elapsed: number;
  duration: number;
  startPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endDirection: THREE.Vector3;
  endRadius: number;
  destination: THREE.Vector3;
  rotation: THREE.Quaternion;
  quick: boolean;
  enterSurface: boolean;
};

export function MarsCameraController() {
  const controls = useRef<OrbitControlsImpl>(null);
  const activeFlight = useRef<ActiveFlight | null>(null);
  const accumulator = useRef(0);
  const frames = useRef(0);
  const fpsTimer = useRef(0);
  const { camera, scene } = useThree();
  const flight = useMarsStore((state) => state.flight);
  const clearFlight = useMarsStore((state) => state.clearFlight);
  const enterSurfaceView = useMarsStore((state) => state.enterSurfaceView);
  const setTelemetry = useMarsStore((state) => state.setTelemetry);

  useEffect(() => {
    if (!flight || !controls.current) return;
    const startPosition = camera.position.clone();
    const startDirection = startPosition.clone().normalize();
    const endDirection = flight.destination.clone().normalize();
    const angle = startDirection.angleTo(endDirection);
    const altitude = Math.max(3, (startPosition.length() - MARS_RADIUS) * METERS_PER_UNIT);
    const enterSurface = flight.enterSurface ?? false;
    let finalAltitude = altitude > 500_000 ? 320_000 : altitude;
    if (flight.quick) finalAltitude = ORBITAL_DESCENT_LIMIT;
    if (flight.desiredAltitude !== undefined) finalAltitude = flight.desiredAltitude;
    finalAltitude = enterSurface
      ? Math.max(3, Math.min(finalAltitude, 120_000))
      : Math.max(ORBITAL_DESCENT_LIMIT, Math.min(finalAltitude, 12_500_000));
    activeFlight.current = {
      key: flight.requestedAt,
      elapsed: 0,
      duration: THREE.MathUtils.clamp(0.65 + (angle / Math.PI) * 4.2, 0.65, 4.9) * (flight.quick ? 0.78 : 1),
      startPosition,
      startTarget: controls.current.target.clone(),
      endDirection,
      endRadius: flight.destination.length() + finalAltitude / METERS_PER_UNIT,
      destination: flight.destination.clone(),
      rotation: new THREE.Quaternion().setFromUnitVectors(startDirection, endDirection),
      quick: flight.quick,
      enterSurface,
    };
    controls.current.enabled = false;
  }, [camera, flight]);

  useFrame((_, delta) => {
    const control = controls.current;
    if (!control) return;
    const currentFlight = activeFlight.current;
    const surfaceDescentInProgress = currentFlight?.enterSurface ?? false;
    if (currentFlight) {
      currentFlight.elapsed += Math.min(delta, 0.05);
      const raw = Math.min(1, currentFlight.elapsed / currentFlight.duration);
      const eased = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
      const q = new THREE.Quaternion().slerp(currentFlight.rotation, eased);
      const direction = currentFlight.startPosition.clone().normalize().applyQuaternion(q).normalize();
      const baseRadius = THREE.MathUtils.lerp(currentFlight.startPosition.length(), currentFlight.endRadius, eased);
      const arc = Math.sin(Math.PI * eased) * Math.min(1.25, 0.18 + currentFlight.startPosition.clone().normalize().angleTo(currentFlight.endDirection) * 0.42);
      camera.position.copy(direction.multiplyScalar(baseRadius + arc));
      control.target.copy(currentFlight.startTarget).lerp(currentFlight.destination, eased);
      camera.lookAt(control.target);
      if (raw >= 1) {
        const shouldEnterSurface = currentFlight.enterSurface;
        activeFlight.current = null;
        control.enabled = true;
        clearFlight();
        if (shouldEnterSurface) { enterSurfaceView(); return; }
      }
    }

    if (!surfaceDescentInProgress && camera.position.length() < MINIMUM_ORBIT_RADIUS) {
      camera.position.normalize().multiplyScalar(MINIMUM_ORBIT_RADIUS);
    }

    const inward = camera.position.clone().negate().normalize();
    const ray = new THREE.Raycaster(camera.position, inward, 0, camera.position.length() + 1);
    const terrain = scene.getObjectByName('mars-terrain');
    const hit = terrain ? ray.intersectObject(terrain, false)[0] : undefined;
    const surfaceRadius = hit?.point.length() ?? MARS_RADIUS + DISPLACEMENT_UNITS / 2;
    let altitude = (camera.position.length() - surfaceRadius) * METERS_PER_UNIT;
    const clearance = altitude < 10 ? 2.2 : 2;
    if (altitude < clearance) {
      camera.position.normalize().multiplyScalar(surfaceRadius + clearance / METERS_PER_UNIT);
      altitude = clearance;
    }

    accumulator.current += delta;
    frames.current += 1;
    fpsTimer.current += delta;
    if (accumulator.current > 0.08) {
      const point = hit?.point ?? camera.position.clone().normalize().multiplyScalar(surfaceRadius);
      const coordinates = cartesianToMars(point);
      setTelemetry({
        cameraPoint: { position: point, ...coordinates },
        altitude,
        zoom: THREE.MathUtils.clamp(1 + Math.log10(12_500_000 / Math.max(2.2, altitude)) * 2.4, 1, 17),
        mode: cameraMode(altitude),
        ...(fpsTimer.current >= 0.5 ? { fps: Math.round(frames.current / fpsTimer.current) } : {}),
      });
      accumulator.current = 0;
      if (fpsTimer.current >= 0.5) { fpsTimer.current = 0; frames.current = 0; }
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.065}
      enablePan={false}
      minDistance={ORBITAL_DESCENT_LIMIT / METERS_PER_UNIT}
      maxDistance={18}
      zoomToCursor
      rotateSpeed={0.42}
      zoomSpeed={0.72}
    />
  );
}
