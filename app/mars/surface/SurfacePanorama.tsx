'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import Image from 'next/image';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { getRoverRoute, getRoverStation, type RoverStation } from '../data/roverStations';
import { useMarsStore } from '../stores/marsStore';

type ViewCommand = { action: 'zoom-in' | 'zoom-out' | 'reset'; key: number };

function SurfaceLookController({ command, station }: { command: ViewCommand; station: RoverStation }) {
  const { gl } = useThree();
  const view = station.panoramaView ?? {
    initialYaw: -1.2,
    initialPitch: -0.03,
    initialFov: 45,
    minPitch: -0.72,
    maxPitch: 0.62,
  };
  const yaw = useRef(view.initialYaw);
  const pitch = useRef(view.initialPitch);
  const fov = useRef(view.initialFov);

  const changeFov = useCallback((amount: number) => {
    fov.current = THREE.MathUtils.clamp(fov.current + amount, 26, 68);
  }, []);

  useEffect(() => {
    if (!command.key) return;
    if (command.action === 'zoom-in') changeFov(-8);
    if (command.action === 'zoom-out') changeFov(8);
    if (command.action === 'reset') {
      yaw.current = view.initialYaw;
      pitch.current = view.initialPitch;
      fov.current = view.initialFov;
    }
  }, [changeFov, command, view.initialFov, view.initialPitch, view.initialYaw]);

  useEffect(() => {
    const element = gl.domElement;
    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    let pinchDistance: number | null = null;
    const pointers = new Map<number, PointerEvent>();
    const down = (event: PointerEvent) => {
      pointers.set(event.pointerId, event);
      dragging = pointers.size === 1;
      previousX = event.clientX;
      previousY = event.clientY;
      element.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      pointers.set(event.pointerId, event);
      if (pointers.size === 2) {
        const [first, second] = [...pointers.values()];
        const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
        if (pinchDistance !== null) changeFov((pinchDistance - distance) * 0.08);
        pinchDistance = distance;
        dragging = false;
        return;
      }
      if (!dragging) return;
      yaw.current -= (event.clientX - previousX) * 0.0032;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - (event.clientY - previousY) * 0.0024,
        view.minPitch,
        view.maxPitch,
      );
      previousX = event.clientX;
      previousY = event.clientY;
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      dragging = false;
      pinchDistance = null;
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      changeFov(event.deltaY * 0.018);
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
  }, [changeFov, gl, view.maxPitch, view.minPitch]);

  useFrame(({ camera: activeCamera }) => {
    activeCamera.rotation.order = 'YXZ';
    activeCamera.rotation.y = yaw.current;
    activeCamera.rotation.x = pitch.current;
    const perspective = activeCamera as THREE.PerspectiveCamera;
    if (perspective.fov !== fov.current) {
      perspective.fov = fov.current;
      perspective.updateProjectionMatrix();
    }
  });
  return null;
}

function RoverPanorama({ station, onReady }: { station: RoverStation; onReady: () => void }) {
  const loadedTexture = useLoader(THREE.TextureLoader, station.image!);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const texture = useMemo(() => {
    const panoramaTexture = loadedTexture.clone();
    panoramaTexture.colorSpace = THREE.SRGBColorSpace;
    panoramaTexture.wrapS = THREE.RepeatWrapping;
    panoramaTexture.repeat.x = -1;
    panoramaTexture.offset.x = 1;
    if (station.panoramaView) {
      const { cropTop, cropBottom } = station.panoramaView;
      panoramaTexture.repeat.y = 1 - cropTop - cropBottom;
      panoramaTexture.offset.y = cropBottom;
    }
    panoramaTexture.anisotropy = Math.min(8, maxAnisotropy);
    panoramaTexture.minFilter = THREE.LinearMipmapLinearFilter;
    panoramaTexture.magFilter = THREE.LinearFilter;
    panoramaTexture.needsUpdate = true;
    return panoramaTexture;
  }, [loadedTexture, maxAnisotropy, station.panoramaView]);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    const frame = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(frame);
  }, [onReady, texture]);
  const usableHeight = station.panoramaView
    ? 1 - station.panoramaView.cropTop - station.panoramaView.cropBottom
    : 1;
  const usableAspect = station.imageAspect / usableHeight;
  const cylinderHeight = (Math.PI * 20) / usableAspect;
  const horizon = station.panoramaView?.horizon ?? 0.5;
  const verticalOffset = -((1 - horizon) - 0.5) * cylinderHeight;
  return (
    <mesh position={[0, verticalOffset, 0]} rotation={[0, Math.PI / 2, 0]}>
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
  const route = getRoverRoute(station.rover);
  const routeIndex = route.stations.findIndex((item) => item.id === station.id);
  const previousStation = route.stations[routeIndex - 1];
  const nextStation = route.stations[routeIndex + 1];
  const [mediaReady, setMediaReady] = useState(station.viewType === 'none');
  const [uiHidden, setUiHidden] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [viewCommand, setViewCommand] = useState<ViewCommand>({ action: 'reset', key: 0 });
  const [showEnhanced, setShowEnhanced] = useState(Boolean(station.enhancedImage));
  const markMediaReady = useCallback(() => setMediaReady(true), []);
  const sendViewCommand = useCallback((action: ViewCommand['action']) => {
    setViewCommand((current) => ({ action, key: current.key + 1 }));
  }, []);

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const action = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    action.catch(() => undefined);
  }, []);

  useEffect(() => {
    const followRoute = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && previousStation) visitStation(previousStation.id);
      if (event.key === 'ArrowRight' && nextStation) visitStation(nextStation.id);
      if (event.key === '+' || event.key === '=') sendViewCommand('zoom-in');
      if (event.key === '-' || event.key === '_') sendViewCommand('zoom-out');
      if (event.key === '0') sendViewCommand('reset');
      if (event.key.toLowerCase() === 'h') setUiHidden((hidden) => !hidden);
      if (event.key.toLowerCase() === 'f') toggleFullscreen();
      if (event.key === 'Escape') setUiHidden(false);
    };
    window.addEventListener('keydown', followRoute);
    return () => window.removeEventListener('keydown', followRoute);
  }, [nextStation, previousStation, sendViewCommand, toggleFullscreen, visitStation]);
  const sceneDescription = station.viewType === 'none'
    ? station.note
    : `${station.region} · ${station.viewType === 'panorama' ? '360° panorama' : 'archival camera frame'} from ${station.instrument.toLowerCase()}${station.imageCount ? ` · ${station.imageCount} source image${station.imageCount === 1 ? '' : 's'}` : ''}.`;
  const displayImage = showEnhanced && station.enhancedImage ? station.enhancedImage : station.image;
  const displayWidth = showEnhanced && station.nativeWidth ? station.nativeWidth * 4 : station.nativeWidth ?? 1600;
  const displayHeight = showEnhanced && station.nativeHeight ? station.nativeHeight * 4 : station.nativeHeight ?? Math.round(1600 / station.imageAspect);
  return (
    <section className={`surface-view${uiHidden ? ' ui-hidden' : ''}`} aria-label={`${station.rover} archive at ${station.name}`}>
      {station.viewType === 'panorama' && (
        <Canvas camera={{ position: [0, 0, 0.001], fov: 45, near: 0.01, far: 30 }} gl={{ antialias: true }} dpr={[1, 2]}>
          <color attach="background" args={['#7a4129']} />
          <Suspense fallback={null}><RoverPanorama station={station} onReady={markMediaReady} /></Suspense>
          <SurfaceLookController key={station.id} command={viewCommand} station={station} />
        </Canvas>
      )}
      {station.viewType === 'photo' && displayImage && (
        <div className={`archive-photo${station.nativeWidth ? ' source-limited' : ''}${showEnhanced ? ' enhanced' : ''}`}>
          <div style={{ backgroundImage: `url(${displayImage})` }} />
          <Image
            src={displayImage}
            alt={`${station.rover} camera view at ${station.name}`}
            width={displayWidth}
            height={displayHeight}
            unoptimized
            onLoad={markMediaReady}
          />
          {station.nativeWidth && station.nativeHeight && (
            <span className="archive-resolution">{showEnhanced ? '4× NON-GENERATIVE UPSCALE' : 'ORIGINAL CAMERA RESOLUTION'} · {station.nativeWidth} × {station.nativeHeight}</span>
          )}
          {station.enhancedImage && (
            <div className="archive-quality-toggle" aria-label="Image quality">
              <span>VIEW</span>
              <button className={!showEnhanced ? 'active' : ''} onClick={() => setShowEnhanced(false)}>ORIGINAL</button>
              <button className={showEnhanced ? 'active' : ''} onClick={() => setShowEnhanced(true)}>4× CLEAN</button>
            </div>
          )}
        </div>
      )}
      {station.viewType === 'none' && (
        <div className="no-surface-data"><span>NO IMAGE RETURN</span><i /> <b>{station.mission}</b><small>ROVER WAS NOT DEPLOYED</small></div>
      )}
      {!mediaReady && (
        <div className="surface-loading" role="status" aria-live="polite">
          <i /><span>RECONSTRUCTING CAMERA VIEW</span><small>{station.rover.toUpperCase()} · {station.instrument}</small>
        </div>
      )}
      <header className="surface-topbar">
        <div className="wordmark"><span className="mission-mark">{station.rover.slice(0, 1)}</span><div><b>{station.rover.toUpperCase()}</b><small>{station.instrument} / {station.sol}</small></div></div>
        <button className="orbit-button" onClick={exitSurfaceView}>↑ RETURN TO ORBIT</button>
      </header>
      {station.viewType === 'panorama' && (
        <nav className="surface-tools" aria-label="Panorama view controls">
          <button onClick={() => sendViewCommand('zoom-out')} aria-label="Zoom out">−</button>
          <button onClick={() => sendViewCommand('reset')} aria-label="Reset view">◎</button>
          <button onClick={() => sendViewCommand('zoom-in')} aria-label="Zoom in">+</button>
          <button onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{fullscreen ? '↙' : '↗'}</button>
          <button onClick={() => setUiHidden(true)} aria-label="Hide interface">H</button>
        </nav>
      )}
      <button className="surface-reveal" onClick={() => setUiHidden(false)}>SHOW INTERFACE · H</button>
      <aside className="surface-caption">
        <p className="panel-label">ARCHIVE SURFACE STATION</p>
        <h2>{station.name}</h2>
        <p>{sceneDescription}</p>
        <div><span>{station.credit}</span><span>{station.date}</span></div>
        <a href={station.sourceUrl} target="_blank" rel="noreferrer">{station.sourceLabel} SOURCE ↗</a>
      </aside>
      <nav className="surface-stations" aria-label={`${station.rover} camera route`}>
        <p><span>ROVER ROUTE</span><b>{routeIndex + 1} / {route.stations.length}</b></p>
        {route.stations.map((item, index) => (
          <button key={item.id} className={item.id === station.id ? 'active' : ''} aria-current={item.id === station.id ? 'location' : undefined} onClick={() => visitStation(item.id)}>
            <span>{String(index + 1).padStart(2, '0')}</span><b>{item.rover}</b><small>{item.name}</small>
          </button>
        ))}
      </nav>
      <div className="route-controls" aria-label="Follow rover camera route">
        <button disabled={!previousStation} onClick={() => previousStation && visitStation(previousStation.id)} aria-label="Previous camera stop">←</button>
        <div><span>{station.rover.toUpperCase()} CAMERA ROUTE</span><b>{routeIndex + 1} OF {route.stations.length}</b><small>{route.stations.length > 1 ? 'USE ARROWS OR ← → KEYS' : 'ONLY ONE VERIFIED CAMERA STOP'}</small></div>
        <button disabled={!nextStation} onClick={() => nextStation && visitStation(nextStation.id)} aria-label="Next camera stop">→</button>
      </div>
      {station.viewType === 'panorama' && <div className="surface-crosshair"><span /><i /></div>}
      <div className="surface-hint">{station.viewType === 'panorama' ? 'DRAG / SWIPE TO LOOK · PINCH / SCROLL TO ZOOM' : 'AUTHENTIC MISSION ARCHIVE'}</div>
    </section>
  );
}
