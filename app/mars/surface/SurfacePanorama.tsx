'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
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

function RoverPanorama() {
  const texture = useLoader(THREE.TextureLoader, '/mars-data/perseverance-airey-hill.jpg');
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = -1;
  texture.offset.x = 1;
  return (
    <mesh rotation={[0, Math.PI / 2, 0]}>
      <cylinderGeometry args={[10, 10, 22.6, 160, 1, true]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

export function SurfacePanorama() {
  const exitSurfaceView = useMarsStore((state) => state.exitSurfaceView);
  return (
    <section className="surface-view" aria-label="Perseverance rover panorama at Airey Hill">
      <Canvas camera={{ position: [0, 0, 0.001], fov: 55, near: 0.01, far: 30 }} gl={{ antialias: true }} dpr={[1, 1.6]}>
        <color attach="background" args={['#9c5c38']} />
        <RoverPanorama />
        <SurfaceLookController />
      </Canvas>
      <header className="surface-topbar">
        <div className="wordmark"><span className="mission-mark">P</span><div><b>PERSEVERANCE</b><small>MASTCAM-Z / SOL 962–965</small></div></div>
        <button className="orbit-button" onClick={exitSurfaceView}>↑ RETURN TO ORBIT</button>
      </header>
      <aside className="surface-caption">
        <p className="panel-label">LIVE SURFACE STATION</p>
        <h2>Airey Hill</h2>
        <p>Jezero Crater · 360° natural-color panorama assembled from 993 Mastcam-Z images.</p>
        <div><span>NASA / JPL-CALTECH / ASU / MSSS</span><span>03–06 NOV 2023</span></div>
      </aside>
      <div className="surface-crosshair"><span /><i /></div>
      <div className="surface-hint">DRAG TO LOOK AROUND · SCROLL TO ZOOM</div>
    </section>
  );
}
