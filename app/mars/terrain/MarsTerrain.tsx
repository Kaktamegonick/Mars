import { ThreeEvent, useLoader } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useMarsStore } from '../stores/marsStore';
import { cartesianToMars, METERS_PER_UNIT } from '../utils/coordinates';
import { TargetMarker } from '../hud/TargetMarker';
import { createMarsGeometry } from './createMarsGeometry';
import { RoverStations } from './RoverStations';
import { MarsAtmosphere } from './MarsAtmosphere';
import { RoverRoutePath } from './RoverRoutePath';

export function MarsTerrain() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [loadedColor, elevation] = useLoader(THREE.TextureLoader, ['/mars-data/mars-color.jpg', '/mars-data/mars-elevation.jpg']);
  const color = useMemo(() => {
    const terrainTexture = loadedColor.clone();
    terrainTexture.colorSpace = THREE.SRGBColorSpace;
    terrainTexture.anisotropy = 8;
    terrainTexture.needsUpdate = true;
    return terrainTexture;
  }, [loadedColor]);
  const geometry = useMemo(() => createMarsGeometry(elevation.image as HTMLImageElement), [elevation]);
  const hover = useMarsStore((state) => state.hover);
  const selected = useMarsStore((state) => state.selected);
  const setHover = useMarsStore((state) => state.setHover);
  const rejectTerrainVisit = useMarsStore((state) => state.rejectTerrainVisit);
  const dreamerArmed = useMarsStore((state) => state.dreamerArmed);
  const visitDreamPoint = useMarsStore((state) => state.visitDreamPoint);
  useEffect(() => {
    if (meshRef.current) meshRef.current.userData.terrain = true;
    return () => { geometry.dispose(); color.dispose(); };
  }, [color, geometry]);

  const pointFromEvent = (event: ThreeEvent<PointerEvent>) => {
    const position = event.point.clone();
    const mars = cartesianToMars(position);
    return { ...mars, position, distance: event.ray.origin.distanceTo(position) * METERS_PER_UNIT };
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        name="mars-terrain"
        geometry={geometry}
        onPointerMove={(event) => { event.stopPropagation(); setHover(pointFromEvent(event)); }}
        onPointerOut={() => setHover(null)}
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta >= 5) return;
          const point = pointFromEvent(event);
          if (dreamerArmed) visitDreamPoint(point);
          else rejectTerrainVisit();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          const point = pointFromEvent(event);
          if (dreamerArmed) visitDreamPoint(point);
          else rejectTerrainVisit();
        }}
      >
        <meshStandardMaterial map={color} roughness={0.98} metalness={0} />
      </mesh>
      {hover && <TargetMarker position={hover.position} />}
      {selected && <TargetMarker position={selected.position} selected />}
      <RoverRoutePath />
      <RoverStations />
      <MarsAtmosphere />
    </group>
  );
}
