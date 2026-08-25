'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { useMarsStore } from '../stores/marsStore';
import { formatElevation, formatLatitude, formatLongitude } from '../utils/coordinates';

const DREAMER_PANORAMAS = [
  '/mars-data/dreamer-mars-360.png',
  '/mars-data/dreamer-mars-360-sunset.png',
] as const;

type LookTelemetry = { heading: number; pitch: number; fov: number };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function DreamerPanoramaTexture({ onReady, source }: { onReady: () => void; source: string }) {
  const loadedTexture = useLoader(THREE.TextureLoader, source);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const texture = useMemo(() => {
    const panorama = loadedTexture.clone();
    panorama.colorSpace = THREE.SRGBColorSpace;
    panorama.wrapS = THREE.RepeatWrapping;
    panorama.anisotropy = Math.min(8, maxAnisotropy);
    panorama.minFilter = THREE.LinearMipmapLinearFilter;
    panorama.magFilter = THREE.LinearFilter;
    panorama.needsUpdate = true;
    return panorama;
  }, [loadedTexture, maxAnisotropy]);

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(onReady);
    return () => window.cancelAnimationFrame(frame);
  }, [onReady, texture]);

  return (
    <mesh rotation={[0, -Math.PI / 2, 0]}>
      <sphereGeometry args={[10, 128, 72]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

const DUST_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uOpacity;
  attribute float aSize;
  attribute float aPhase;
  attribute vec2 aDrift;
  varying float vAlpha;
  varying float vGlow;

  void main() {
    vec3 particle = position;
    float wind = uTime * (0.14 + aSize * 0.05);
    particle.x = mod(particle.x + wind + 7.0, 14.0) - 7.0;
    particle.z = mod(particle.z + wind * 0.36 + 7.0, 14.0) - 7.0;
    particle.y = mod(particle.y - uTime * (0.025 + aSize * 0.026) + 3.5, 7.0) - 3.5;

    float turbulence = sin(uTime * 0.52 + aPhase * 17.0 + particle.z * 0.8)
      + cos(uTime * 0.31 + aPhase * 11.0 + particle.x * 0.55);
    particle.y += turbulence * 0.07 * (0.45 + aDrift.x);
    particle.z += sin(uTime * 0.4 + aPhase * 23.0) * 0.08 * aDrift.y;

    vec4 viewPosition = modelViewMatrix * vec4(particle, 1.0);
    float depth = -viewPosition.z;
    float inFront = step(0.08, depth);
    float nearFade = smoothstep(0.34, 0.9, depth);
    float farFade = 1.0 - smoothstep(5.8, 7.8, depth);
    float baseSize = mix(1.0, 4.4, aSize) * uSize * uPixelRatio;

    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(baseSize * (2.8 / max(depth, 0.2)), 0.65, 12.0) * inFront;
    vAlpha = (0.2 + aSize * 0.34) * nearFade * farFade * inFront * uOpacity;
    vGlow = aSize;
  }
`;

const DUST_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  varying float vAlpha;
  varying float vGlow;

  void main() {
    vec2 point = gl_PointCoord - vec2(0.5);
    float distanceFromCentre = length(point) * 2.0;
    float softEdge = smoothstep(1.0, 0.1, distanceFromCentre);
    float core = smoothstep(0.34, 0.0, distanceFromCentre);
    float alpha = (softEdge * 0.58 + core * 0.42) * vAlpha;
    vec3 color = mix(uColor, vec3(1.0, 0.93, 0.82), core * (0.2 + vGlow * 0.35));
    if (alpha < 0.006) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

function DreamerDustField() {
  const points = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const particleCount = 920;
  const { geometry, material } = useMemo(() => {
    const dustGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    const drifts = new Float32Array(particleCount * 2);
    let randomSeed = 1977;
    const random = () => {
      randomSeed = (randomSeed * 16807) % 2147483647;
      return (randomSeed - 1) / 2147483646;
    };

    for (let index = 0; index < particleCount; index += 1) {
      const offset = index * 3;
      positions[offset] = (random() - 0.5) * 14;
      positions[offset + 1] = (random() - 0.5) * 7;
      positions[offset + 2] = (random() - 0.5) * 14;
      sizes[index] = Math.pow(random(), 2.15);
      phases[index] = random();
      drifts[index * 2] = random();
      drifts[index * 2 + 1] = random();
    }

    dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    dustGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    dustGeometry.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 2));
    const dustMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5) },
        uSize: { value: 0.9 },
        uOpacity: { value: 0.72 },
        uColor: { value: new THREE.Color('#ffe2b8') },
      },
      vertexShader: DUST_VERTEX_SHADER,
      fragmentShader: DUST_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    return { geometry: dustGeometry, material: dustMaterial };
  }, [particleCount]);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateVisibility = () => { if (points.current) points.current.visible = !motionQuery.matches; };
    updateVisibility();
    motionQuery.addEventListener('change', updateVisibility);
    return () => {
      motionQuery.removeEventListener('change', updateVisibility);
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} renderOrder={2}>
      <primitive ref={materialRef} object={material} attach="material" />
    </points>
  );
}

function DreamerLookController({ onTelemetry }: { onTelemetry: (telemetry: LookTelemetry) => void }) {
  const { gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(-0.025);
  const fov = useRef(58);

  const reportView = useCallback(() => {
    onTelemetry({
      heading: (225 + THREE.MathUtils.radToDeg(yaw.current) + 3600) % 360,
      pitch: THREE.MathUtils.radToDeg(pitch.current),
      fov: fov.current,
    });
  }, [onTelemetry]);

  const changeFov = useCallback((amount: number) => {
    fov.current = THREE.MathUtils.clamp(fov.current + amount, 34, 70);
    reportView();
  }, [reportView]);

  useEffect(() => {
    const element = gl.domElement;
    const pointers = new Map<number, PointerEvent>();
    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    let pinchDistance: number | null = null;

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
        if (pinchDistance !== null) changeFov((pinchDistance - distance) * 0.075);
        pinchDistance = distance;
        dragging = false;
        return;
      }
      if (!dragging) return;
      yaw.current -= (event.clientX - previousX) * 0.0031;
      pitch.current = THREE.MathUtils.clamp(pitch.current - (event.clientY - previousY) * 0.00235, -0.76, 0.58);
      previousX = event.clientX;
      previousY = event.clientY;
      reportView();
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      dragging = false;
      pinchDistance = null;
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      changeFov(event.deltaY * 0.016);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') yaw.current += 0.055;
      else if (event.key === 'ArrowRight') yaw.current -= 0.055;
      else if (event.key === 'ArrowUp') pitch.current = Math.min(0.58, pitch.current + 0.04);
      else if (event.key === 'ArrowDown') pitch.current = Math.max(-0.76, pitch.current - 0.04);
      else if (event.key === '+' || event.key === '=') changeFov(-4);
      else if (event.key === '-' || event.key === '_') changeFov(4);
      else if (event.key === '0') {
        yaw.current = 0;
        pitch.current = -0.025;
        fov.current = 58;
      } else return;
      reportView();
    };

    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    element.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', keydown);
    reportView();
    return () => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', keydown);
    };
  }, [changeFov, gl, reportView]);

  useFrame(({ camera }) => {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    const perspective = camera as THREE.PerspectiveCamera;
    if (perspective.fov !== fov.current) {
      perspective.fov = fov.current;
      perspective.updateProjectionMatrix();
    }
  });
  return null;
}

function DreamerPanorama({ onReady, onTelemetry, source }: { onReady: () => void; onTelemetry: (telemetry: LookTelemetry) => void; source: string }) {
  return (
    <div className="dreamer-panorama" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 0.001], fov: 58, near: 0.01, far: 30 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#8a4f37']} />
        <Suspense fallback={null}>
          <DreamerPanoramaTexture source={source} onReady={onReady} />
        </Suspense>
        <DreamerDustField />
        <DreamerLookController onTelemetry={onTelemetry} />
      </Canvas>
      <div className="dreamer-distance-haze" />
      <div className="dreamer-dust-haze" />
      <div className="dreamer-edge-depth" />
      <div className="dreamer-visor-optics" />
    </div>
  );
}

export function DreamerSurface() {
  const dreamerPoint = useMarsStore((state) => state.dreamerPoint);
  const cameraPoint = useMarsStore((state) => state.cameraPoint);
  const panoramaIndex = useMarsStore((state) => state.dreamerPanoramaIndex);
  const exitDreamerView = useMarsStore((state) => state.exitDreamerView);
  const point = dreamerPoint ?? cameraPoint;
  const [sceneReady, setSceneReady] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [telemetry, setTelemetry] = useState<LookTelemetry>({ heading: 225, pitch: 0, fov: 58 });
  const [localTime, setLocalTime] = useState('--:--');
  const markReady = useCallback(() => setSceneReady(true), []);
  const updateTelemetry = useCallback((next: LookTelemetry) => setTelemetry(next), []);

  useEffect(() => {
    if (!sceneReady) return;
    const timer = window.setTimeout(() => setBootComplete(true), 1100);
    return () => window.clearTimeout(timer);
  }, [sceneReady]);

  useEffect(() => {
    const updateTime = () => setLocalTime(new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()));
    updateTime();
    const timer = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const action = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    action.catch(() => undefined);
  }, []);

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'h') setUiHidden((hidden) => !hidden);
      if (event.key.toLowerCase() === 'f') toggleFullscreen();
      if (event.key === 'Escape' && !document.fullscreenElement) exitDreamerView();
    };
    window.addEventListener('keydown', shortcuts);
    return () => window.removeEventListener('keydown', shortcuts);
  }, [exitDreamerView, toggleFullscreen]);

  const heading = Math.round(telemetry.heading).toString().padStart(3, '0');
  const hudMotion = {
    '--hud-x': `${clamp((telemetry.heading - 225) * -0.22, -7, 7)}px`,
    '--hud-y': `${clamp(telemetry.pitch * 0.18, -4, 4)}px`,
  } as CSSProperties;

  return (
    <section className={`dreamer-view${uiHidden ? ' ui-hidden' : ''}`} aria-label="Dreamer mode imagined Mars surface">
      <DreamerPanorama source={DREAMER_PANORAMAS[panoramaIndex]} onReady={markReady} onTelemetry={updateTelemetry} />

      <div className="dreamer-helmet" aria-hidden="true">
        <div className="helmet-crown" />
        <div className="helmet-side helmet-side-left" />
        <div className="helmet-side helmet-side-right" />
        <div className="helmet-chin"><i /><b /></div>
        <div className="helmet-seal helmet-seal-outer" />
        <div className="helmet-seal helmet-seal-inner" />
        <i className="helmet-bolt helmet-bolt-left" />
        <i className="helmet-bolt helmet-bolt-right" />
      </div>
      <div className="dreamer-glass" aria-hidden="true"><i /><b /><span /></div>
      <button className="dreamer-reveal" onClick={() => setUiHidden(false)}>RAISE HUD</button>
      <button className="dreamer-exit" onClick={exitDreamerView}>EXIT TO ORBIT ↑</button>

      <div className="dreamer-hud" style={hudMotion}>
        <div className="dreamer-bearing" aria-label={`Heading ${heading} degrees`}>
          <div className="dreamer-bearing-scale"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <b>{heading}°W</b>
          <span>MISSION DAY 01</span>
        </div>

        <aside className="dreamer-readout dreamer-environment">
          <p>SOL 01</p>
          <b>TIME {localTime}</b>
          <hr />
          <span>ENVIRONMENT</span>
          <strong>19.4°C&nbsp;&nbsp;|&nbsp;&nbsp;14%&nbsp;&nbsp;|&nbsp;&nbsp;6.1 m/s</strong>
        </aside>

        <aside className="dreamer-readout dreamer-navigation">
          <p>LOCATION</p>
          <strong>{formatLatitude(point.latitude)}&nbsp;&nbsp;&nbsp;{formatLongitude(point.longitude)}</strong>
          <hr />
          <span>ELEVATION</span>
          <b>{formatElevation(point.elevation)}</b>
        </aside>

        <aside className="dreamer-pressure">
          <span>SUIT PRESSURE</span>
          <b>101.3 <small>kPa</small></b>
          <div><i /><i /><i /><i /></div>
        </aside>

        <aside className="dreamer-systems">
          <p>SUIT SYSTEMS</p>
          <div><span>OXYGEN</span><i><b style={{ width: '98%' }} /></i><small>98%</small></div>
          <div><span>ECG</span><i><b style={{ width: '92%' }} /></i><small>92%</small></div>
          <div><span>POWER</span><i><b style={{ width: '92%' }} /></i><small>92%</small></div>
          <div><span>O₂</span><i><b style={{ width: '87%' }} /></i><small>87%</small></div>
          <div><span>HYDRATION</span><i><b style={{ width: '81%' }} /></i><small>81%</small></div>
        </aside>

        <div className="dreamer-reticle" aria-hidden="true"><span /><i /><b /></div>

        <footer className="dreamer-footer">
          <span>DRAG / SWIPE · 360° LOOK</span><span>SCROLL · ZOOM</span><span>H · HUD</span><span>F · {fullscreen ? 'WINDOW' : 'FULLSCREEN'}</span>
          <b>IMAGINED VIEW · NOT A ROVER PHOTOGRAPH</b>
        </footer>
      </div>

      {(!sceneReady || !bootComplete) && (
        <div className={`dreamer-boot${sceneReady ? ' online' : ''}`} role="status" aria-live="polite">
          <div className="dreamer-boot-mark">✦</div>
          <span>{sceneReady ? 'DREAMER VISOR ONLINE' : 'LOADING VISUAL INTERPRETATION'}</span>
          <i><b /></i>
          <small>{sceneReady ? 'IMAGINED SURFACE / READY' : `${formatLatitude(point.latitude)} · ${formatLongitude(point.longitude)}`}</small>
        </div>
      )}
    </section>
  );
}
