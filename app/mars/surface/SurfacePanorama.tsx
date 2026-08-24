'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getRoverStation, ROVER_STATIONS, type RoverStation } from '../data/roverStations';
import { useMarsStore } from '../stores/marsStore';

function SurfaceLookController() {
  const { camera, gl } = useThree();
  const yaw = useRef(-1.2);
  const pitch = useRef(-0.03);

  useEffect(() => {
    const element = gl.domElement;
    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    const down = (event: PointerEvent) => { dragging = true; previousX = event.clientX; previousY = event.clientY; element.setPointerCapture(event.pointerId); };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      yaw.current -= (event.clientX - previousX) * 0.0032;
      pitch.current = THREE.MathUtils.clamp(pitch.current - (event.clientY - previousY) * 0.0024, -0.72, 0.62);
      previousX = event.clientX;
      previousY = event.clientY;
    };
    const up = (event: PointerEvent) => { dragging = false; if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId); };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const perspective = camera as THREE.PerspectiveCamera;
      perspective.fov = THREE.MathUtils.clamp(perspective.fov + event.deltaY * 0.018, 28, 72);
      perspective.updateProjectionMatrix();
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    element.addEventListener('wheel', wheel, { passive: false });
    return () => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('wheel', wheel);
    };
  }, [camera, gl]);

  useFrame(() => {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
  });
  return null;
}

function RoverPanorama({ station }: { station: RoverStation }) {
  const texture = useLoader(THREE.TextureLoader, station.image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = -1;
  texture.offset.x = 1;
  const cylinderHeight = THREE.MathUtils.clamp((Math.PI * 20) / station.imageAspect, 12, 18);
  return (
    <mesh rotation={[0, Math.PI / 2, 0]}>
      <cylinderGeometry args={[10, 10, cylinderHeight, 160, 1, true]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

export function SurfacePanorama() {
  const exitSurfaceView = useMarsStore((state) => state.exitSurfaceView);
  const activeStationId = useMarsStore((state) => state.activeStationId);
  const visitStation = useMarsStore((state) => state.visitStation);
  const station = getRoverStation(activeStationId);
  return (
    <section className="surface-view" aria-label={`Perseverance rover panorama at ${station.name}`}>
      <Canvas camera={{ position: [0, 0, 0.001], fov: 55, near: 0.01, far: 30 }} gl={{ antialias: true }} dpr={[1, 1.6]}>
        <color attach="background" args={['#9c5c38']} />
        <RoverPanorama station={station} />
        <SurfaceLookController />
      </Canvas>
      <header className="surface-topbar">
        <div className="wordmark"><span className="mission-mark">P</span><div><b>PERSEVERANCE</b><small>MASTCAM-Z / {station.sol}</small></div></div>
        <button className="orbit-button" onClick={exitSurfaceView}>↑ RETURN TO ORBIT</button>
      </header>
      <aside className="surface-caption">
        <p className="panel-label">ARCHIVE SURFACE STATION</p>
        <h2>{station.name}</h2>
        <p>{station.region} · 360° {station.colorMode.toLowerCase()} panorama assembled from {station.imageCount} Mastcam-Z images.</p>
        <div><span>{station.credit}</span><span>{station.date}</span></div>
        <a href={station.sourceUrl} target="_blank" rel="noreferrer">NASA SOURCE ↗</a>
      </aside>
      <nav className="surface-stations" aria-label="Rover panorama stations">
        {ROVER_STATIONS.map((item, index) => (
          <button key={item.id} className={item.id === station.id ? 'active' : ''} onClick={() => visitStation(item.id)}>
            <span>0{index + 1}</span>{item.name}
          </button>
        ))}
      </nav>
      <div className="surface-crosshair"><span /><i /></div>
      <div className="surface-hint">DRAG TO LOOK AROUND · SCROLL TO ZOOM</div>
    </section>
  );
}
