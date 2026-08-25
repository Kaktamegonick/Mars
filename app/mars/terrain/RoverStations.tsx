import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { ROVER_STATIONS, stationPosition, type RoverStation } from '../data/roverStations';
import { useMarsStore } from '../stores/marsStore';

const UP = new THREE.Vector3(0, 0, 1);

function StationMarker({ station, active, onVisit }: { station: RoverStation; active: boolean; onVisit: () => void }) {
  const marker = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const position = stationPosition(station);
  const normal = position.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, normal);
  const hasSurfaceImage = station.viewType !== 'none';

  useFrame(({ camera, clock }) => {
    if (marker.current) {
      const distance = camera.position.distanceTo(position);
      marker.current.scale.setScalar(THREE.MathUtils.clamp(distance / 5, 0.024, 1.2));
    }
    if (halo.current && active) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.16;
      halo.current.scale.setScalar(pulse);
    }
  });

  return (
    <group
      ref={marker}
      position={position}
      quaternion={quaternion}
      onClick={(event) => { event.stopPropagation(); onVisit(); }}
      onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      <mesh position={[0, 0, 0.045]}>
        <sphereGeometry args={[0.09, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[active ? 0.052 : 0.040, active ? 0.072 : 0.058, 48]} />
        <meshBasicMaterial color={active ? '#ff7845' : hasSurfaceImage ? '#f1e8dc' : '#81766e'} transparent opacity={0.96} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={halo} position={[0, 0, -0.001]}>
        <ringGeometry args={[0.078, 0.084, 48]} />
        <meshBasicMaterial color={hasSurfaceImage ? '#e86131' : '#81766e'} transparent opacity={active ? 0.6 : 0.16} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.052]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0032, 0.0042, 0.102, 8]} />
        <meshBasicMaterial color={active ? '#fff4e8' : '#c9bdb0'} />
      </mesh>
      <mesh position={[0.027, 0, 0.09]}>
        <planeGeometry args={[0.054, 0.032]} />
        <meshBasicMaterial color={hasSurfaceImage ? active ? '#ff7845' : '#e86131' : '#81766e'} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.104]}>
        <sphereGeometry args={[0.0058, 12, 8]} />
        <meshBasicMaterial color="#f1e8dc" />
      </mesh>
      {active && (
        <Html center position={[0, 0, 0.15]} distanceFactor={7} className="station-label">
          <span>{station.rover.toUpperCase()}</span><b>{station.name}</b><small>{hasSurfaceImage ? 'CLICK FLAG TO DESCEND' : 'NO CAMERA RETURN'}</small>
        </Html>
      )}
    </group>
  );
}

export function RoverStations() {
  const activeStationId = useMarsStore((state) => state.activeStationId);
  const selected = useMarsStore((state) => state.selected);
  const visitStation = useMarsStore((state) => state.visitStation);

  return (
    <group>
      {ROVER_STATIONS.map((station) => {
        const position = stationPosition(station);
        const isSelectedStation = selected
          ? selected.position.distanceToSquared(position) < 0.000001
          : false;
        const active = station.id === activeStationId && isSelectedStation;
        return (
          <StationMarker
            key={station.id}
            station={station}
            active={active}
            onVisit={() => visitStation(station.id)}
          />
        );
      })}
    </group>
  );
}
