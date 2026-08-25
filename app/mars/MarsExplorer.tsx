'use client';

import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { Suspense } from 'react';
import { MarsTerrain } from './terrain/MarsTerrain';
import { MarsCameraController } from './camera/MarsCameraController';
import { HUD } from './hud/HUD';
import { useMarsStore } from './stores/marsStore';
import { SurfacePanorama } from './surface/SurfacePanorama';
import { MroTrajectory } from './orbit/MroTrajectory';
import { DreamerSurface } from './dreamer/DreamerSurface';

export default function MarsExplorer() {
  const surfaceView = useMarsStore((state) => state.surfaceView);
  const dreamerView = useMarsStore((state) => state.dreamerView);
  const activeStationId = useMarsStore((state) => state.activeStationId);
  if (dreamerView) return <DreamerSurface />;
  if (surfaceView) return <SurfacePanorama key={activeStationId} />;
  return (
    <main className="explorer-shell">
      <Canvas
        camera={{ position: [0, 1.4, 8.4], fov: 42, near: 0.000001, far: 200 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.75]}
        onPointerMissed={() => useMarsStore.getState().setHover(null)}
      >
        <color attach="background" args={['#050301']} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[8, 4, 6]} intensity={4.2} color="#ffd6ae" />
        <Stars radius={80} depth={36} count={1700} factor={2.3} saturation={0} fade speed={0.25} />
        <Suspense fallback={null}><MarsTerrain /></Suspense>
        <MroTrajectory />
        <MarsCameraController />
      </Canvas>
      <HUD />
    </main>
  );
}
