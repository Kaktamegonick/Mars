import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { ROVER_STATIONS, stationPosition, type RoverStation } from '../data/roverStations';
import { useMarsStore } from '../stores/marsStore';

const UP = new THREE.Vector3(0, 0, 1);

function StationMarker({ station, active, onVisit }: { station: RoverStation; active: boolean; onVisit: () => void }) {
  const halo = useRef<THREE.Mesh>(null);
  const position = stationPosition(station);
  const normal = position.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, normal);
  const hasSurfaceImage = station.viewType !== 'none';

  useFrame(({ clock }) => {
    if (!halo.current || !active) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.16;
    halo.current.scale.setScalar(pulse);
  });

  return (
    <group
      position={position}
      quaternion={quaternion}
      onClick={(event) => { event.stopPropagation(); onVisit(); }}
      onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      <mesh>
        <ringGeometry args={[active ? 0.038 : 0.028, active ? 0.052 : 0.040, 48]} />
        <meshBasicMaterial color={active ? '#ff7845' : hasSurfaceImage ? '#f1e8dc' : '#81766e'} transparent opacity={0.96} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={halo} position={[0, 0, -0.001]}>
        <ringGeometry args={[0.056, 0.06, 48]} />
        <meshBasicMaterial color={hasSurfaceImage ? '#e86131' : '#81766e'} transparent opacity={active ? 0.6 : 0.16} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.038]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0024, 0.0032, 0.074, 8]} />
        <meshBasicMaterial color={active ? '#fff4e8' : '#c9bdb0'} />
      </mesh>
      <mesh position={[0.019, 0, 0.066]}>
        <planeGeometry args={[0.038, 0.023]} />
        <meshBasicMaterial color={hasSurfaceImage ? active ? '#ff7845' : '#e86131' : '#81766e'} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.076]}>
        <sphereGeometry args={[0.0042, 12, 8]} />
        <meshBasicMaterial color="#f1e8dc" />
      </mesh>
    </group>
  );
}

export function RoverStations() {
  const activeStationId = useMarsStore((state) => state.activeStationId);
  const visitStation = useMarsStore((state) => state.visitStation);

  return (
    <group>
      {ROVER_STATIONS.map((station) => {
        const active = station.id === activeStationId;
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
