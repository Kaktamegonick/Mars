'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import Image from 'next/image';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { getRoverRoute, getRoverStation, type RoverStation } from '../data/roverStations';
import { useMarsStore } from '../stores/marsStore';

type ViewCommand = { action: 'zoom-in' | 'zoom-out' | 'reset'; key: number };

function SurfaceLookController({ command }: { command: ViewCommand }) {
  const { gl } = useThree();
  const yaw = useRef(-1.2);
  const pitch = useRef(-0.03);
  const targetYaw = useRef(-1.2);
  const targetPitch = useRef(-0.03);
  const targetFov = useRef(45);
  const currentFov = useRef(45);

  const changeFov = useCallback((amount: number) => {
    targetFov.current = THREE.MathUtils.clamp(targetFov.current + amount, 26, 68);
  }, []);

  useEffect(() => {
    if (!command.key) return;
    if (command.action === 'zoom-in') changeFov(-8);
    if (command.action === 'zoom-out') changeFov(8);
    if (command.action === 'reset') {
      targetYaw.current = -1.2;
      targetPitch.current = -0.03;
      targetFov.current = 45;
    }
  }, [changeFov, command]);

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
      targetYaw.current -= (event.clientX - previousX) * 0.0035;
      targetPitch.current = THREE.MathUtils.clamp(targetPitch.current - (event.clientY - previousY) * 0.0027, -0.72, 0.62);
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
  }, [changeFov, gl]);

  useFrame(({ camera: activeCamera }, delta) => {
    yaw.current = THREE.MathUtils.damp(yaw.current, targetYaw.current, 13, delta);
    pitch.current = THREE.MathUtils.damp(pitch.current, targetPitch.current, 13, delta);
    currentFov.current = THREE.MathUtils.damp(currentFov.current, targetFov.current, 11, delta);
    activeCamera.rotation.order = 'YXZ';
    activeCamera.rotation.y = yaw.current;
    activeCamera.rotation.x = pitch.current;
    const perspective = activeCamera as THREE.PerspectiveCamera;
    if (Math.abs(perspective.fov - currentFov.current) > 0.001) {
      perspective.fov = currentFov.current;
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
    panoramaTexture.anisotropy = Math.min(8, maxAnisotropy);
    panoramaTexture.minFilter = THREE.LinearMipmapLinearFilter;
    panoramaTexture.magFilter = THREE.LinearFilter;
    panoramaTexture.needsUpdate = true;
    return panoramaTexture;
  }, [loadedTexture, maxAnisotropy]);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    const frame = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(frame);
  }, [onReady, texture]);
  const uniforms = useMemo(() => ({
    panorama: { value: texture },
    imageAspect: { value: station.imageAspect },
  }), [station.imageAspect, texture]);
  return (
    <mesh>
      <sphereGeometry args={[11.5, 160, 96]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={PANORAMA_VERTEX_SHADER}
        fragmentShader={PANORAMA_FRAGMENT_SHADER}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

const PANORAMA_VERTEX_SHADER = `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PANORAMA_FRAGMENT_SHADER = `
  uniform sampler2D panorama;
  uniform float imageAspect;
  varying vec3 vDirection;
  const float PI = 3.141592653589793;

  void main() {
    vec3 direction = normalize(vDirection);
    float yaw = atan(direction.z, direction.x);
    float elevation = atan(direction.y, length(direction.xz));
    float u = fract(0.75 - yaw / (2.0 * PI));
    float sourceV = 0.5 + tan(elevation) * imageAspect / (2.0 * PI);
    float edgeV = clamp(sourceV, 0.004, 0.996);

    vec3 photo = texture2D(panorama, vec2(u, edgeV)).rgb;
    vec3 softEdge = (
      texture2D(panorama, vec2(fract(u - 0.008), edgeV)).rgb +
      texture2D(panorama, vec2(fract(u - 0.003), edgeV)).rgb +
      photo * 2.0 +
      texture2D(panorama, vec2(fract(u + 0.003), edgeV)).rgb +
      texture2D(panorama, vec2(fract(u + 0.008), edgeV)).rgb
    ) / 6.0;

    float outside = max(-sourceV, sourceV - 1.0);
    float extension = smoothstep(0.0, 0.9, outside);
    vec3 zenith = vec3(0.22, 0.095, 0.048);
    vec3 ground = vec3(0.13, 0.048, 0.022);
    vec3 continuation = sourceV > 1.0
      ? mix(softEdge, zenith, extension)
      : mix(softEdge, ground, extension);
    float photoMask = smoothstep(-0.035, 0.055, sourceV)
      * (1.0 - smoothstep(0.945, 1.035, sourceV));
    vec3 color = mix(continuation, photo, photoMask);
    float horizonHaze = exp(-abs(elevation) * 9.0);
    color += vec3(0.025, 0.011, 0.005) * horizonHaze;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

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
          <SurfaceLookController command={viewCommand} />
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
          <button key={item.id} className={item.id === station.id ? 'active' : ''} onClick={() => visitStation(item.id)}>
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
