import * as THREE from 'three';

export function TargetMarker({ position, selected = false }: { position: THREE.Vector3; selected?: boolean }) {
  const normal = position.clone().normalize();
  const markerPosition = position.clone().addScaledVector(normal, 0.006);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  return (
    <group position={markerPosition} quaternion={quaternion}>
      <mesh>
        <ringGeometry args={[selected ? 0.026 : 0.018, selected ? 0.033 : 0.024, 40]} />
        <meshBasicMaterial color={selected ? '#ff7845' : '#f1e8dc'} transparent opacity={0.95} side={THREE.DoubleSide} depthTest />
      </mesh>
      <mesh>
        <circleGeometry args={[0.004, 20]} />
        <meshBasicMaterial color="#ff6833" depthTest />
      </mesh>
    </group>
  );
}
