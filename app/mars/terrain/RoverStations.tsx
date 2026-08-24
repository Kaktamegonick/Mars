import * as THREE from 'three';
import { ROVER_STATIONS, stationPosition } from '../data/roverStations';
import { useMarsStore } from '../stores/marsStore';

const UP = new THREE.Vector3(0, 0, 1);

export function RoverStations() {
  const activeStationId = useMarsStore((state) => state.activeStationId);
  const visitStation = useMarsStore((state) => state.visitStation);

  return (
    <group>
      {ROVER_STATIONS.map((station) => {
        const position = stationPosition(station);
        const normal = position.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, normal);
        const active = station.id === activeStationId;
        return (
          <group
            key={station.id}
            position={position}
            quaternion={quaternion}
            onClick={(event) => { event.stopPropagation(); visitStation(station.id); }}
            onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = ''; }}
          >
            <mesh>
              <ringGeometry args={[active ? 0.038 : 0.028, active ? 0.052 : 0.040, 48]} />
              <meshBasicMaterial color={active ? '#ff7845' : '#f1e8dc'} transparent opacity={0.96} side={THREE.DoubleSide} depthTest={false} />
            </mesh>
            <mesh position={[0, 0, 0.004]}>
              <circleGeometry args={[0.009, 24]} />
              <meshBasicMaterial color="#e86131" depthTest={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
