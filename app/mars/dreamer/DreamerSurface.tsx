'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { useMarsStore, type MarsPoint } from '../stores/marsStore';
import { formatElevation, formatLatitude, formatLongitude } from '../utils/coordinates';

type LookTelemetry = { heading: number; pitch: number; fov: number };

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function samplePixel(data: Uint8ClampedArray, width: number, height: number, u: number, v: number) {
  const wrappedU = ((u % 1) + 1) % 1;
  const clampedV = THREE.MathUtils.clamp(v, 0, 0.999999);
  const x = Math.floor(wrappedU * width);
  const y = Math.floor(clampedV * height);
  return data[(y * width + x) * 4];
}

function DreamerTerrain({ point, onReady }: { point: MarsPoint; onReady: () => void }) {
  const [loadedColor, elevation] = useLoader(THREE.TextureLoader, ['/mars-data/mars-color.jpg', '/mars-data/mars-elevation.jpg']);
  const centerU = (point.longitude + 180) / 360;
  const centerVTexture = (point.latitude + 90) / 180;
  const centerVImage = (90 - point.latitude) / 180;
  const patchSpan = 0.115;

  const { geometry, color } = useMemo(() => {
    const texture = loadedColor.clone();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(patchSpan, patchSpan);
    texture.offset.set(centerU - patchSpan / 2, centerVTexture - patchSpan / 2);
    texture.anisotropy = 8;
    texture.needsUpdate = true;

    const image = elevation.image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context?.getImageData(0, 0, canvas.width, canvas.height).data;
    const terrain = new THREE.PlaneGeometry(240, 240, 144, 144);
    terrain.rotateX(-Math.PI / 2);
    const positions = terrain.getAttribute('position') as THREE.BufferAttribute;
    const centerHeight = pixels ? samplePixel(pixels, canvas.width, canvas.height, centerU, centerVImage) : 128;
    const seed = point.latitude * 17.13 + point.longitude * 31.71;

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      const u = centerU + (x / 240) * patchSpan;
      const v = centerVImage - (z / 240) * patchSpan;
      const sourceHeight = pixels ? samplePixel(pixels, canvas.width, canvas.height, u, v) : centerHeight;
      const localRelief = ((sourceHeight - centerHeight) / 255) * 22;
      const fineRelief = Math.sin(x * 0.12 + seed) * 0.34 + Math.cos(z * 0.095 - seed) * 0.28;
      const distance = Math.hypot(x, z);
      const cameraClearance = THREE.MathUtils.smoothstep(distance, 0, 18);
      positions.setY(index, (localRelief + fineRelief) * cameraClearance);
    }
    positions.needsUpdate = true;
    terrain.computeVertexNormals();
    return { geometry: terrain, color: texture };
  }, [centerU, centerVImage, centerVTexture, elevation.image, loadedColor, patchSpan, point.latitude, point.longitude]);

  const rocks = useMemo(() => Array.from({ length: 42 }, (_, index) => {
    const angle = pseudoRandom(index + point.latitude * 9.7) * Math.PI * 2;
    const radius = 12 + pseudoRandom(index * 2.7 + point.longitude) * 86;
    return {
      position: [Math.cos(angle) * radius, 0.08, Math.sin(angle) * radius] as [number, number, number],
      rotation: [pseudoRandom(index + 4), pseudoRandom(index + 9) * Math.PI, pseudoRandom(index + 12)] as [number, number, number],
      scale: 0.18 + pseudoRandom(index * 4.1) * 0.78,
    };
  }), [point.latitude, point.longitude]);

  useEffect(() => {
    const frame = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(frame);
  }, [geometry, onReady]);

  useEffect(() => () => {
    geometry.dispose();
    color.dispose();
  }, [color, geometry]);

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial map={color} color="#b86c43" roughness={1} metalness={0} />
      </mesh>
      {rocks.map((rock, index) => (
        <mesh key={index} position={rock.position} rotation={rock.rotation} scale={rock.scale} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={index % 3 === 0 ? '#713a25' : '#985436'} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function DreamerDust() {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(900 * 3);
    for (let index = 0; index < 900; index += 1) {
      positions[index * 3] = (pseudoRandom(index * 2.1) - 0.5) * 140;
      positions[index * 3 + 1] = pseudoRandom(index * 4.7) * 24;
      positions[index * 3 + 2] = (pseudoRandom(index * 7.3) - 0.5) * 140;
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return result;
  }, []);

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.008;
  });

  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color="#f0a06f" size={0.045} transparent opacity={0.38} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function MartianSky() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      horizonColor: { value: new THREE.Color('#c76b43') },
      zenithColor: { value: new THREE.Color('#160d0b') },
      sunColor: { value: new THREE.Color('#ffe1bd') },
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDirection;
      uniform vec3 horizonColor;
      uniform vec3 zenithColor;
      uniform vec3 sunColor;
      void main() {
        float height = clamp(vDirection.y * 0.72 + 0.3, 0.0, 1.0);
        float gradient = smoothstep(0.02, 0.82, height);
        vec3 color = mix(horizonColor, zenithColor, gradient);
        vec3 sunDirection = normalize(vec3(-0.58, 0.24, -0.78));
        float sun = pow(max(dot(vDirection, sunDirection), 0.0), 620.0);
        float halo = pow(max(dot(vDirection, sunDirection), 0.0), 18.0) * 0.2;
        color += sunColor * (sun * 1.8 + halo);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  }), []);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh scale={190} material={material} renderOrder={-10}>
      <sphereGeometry args={[1, 48, 28]} />
    </mesh>
  );
}

function DreamerLookController({ onTelemetry }: { onTelemetry: (telemetry: LookTelemetry) => void }) {
  const { gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(-0.11);
  const targetYaw = useRef(0);
  const targetPitch = useRef(-0.11);
  const fov = useRef(56);
  const telemetryTimer = useRef(0);

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
        if (pinchDistance !== null) fov.current = THREE.MathUtils.clamp(fov.current + (pinchDistance - distance) * 0.06, 32, 72);
        pinchDistance = distance;
        dragging = false;
        return;
      }
      if (!dragging) return;
      targetYaw.current -= (event.clientX - previousX) * 0.003;
      targetPitch.current = THREE.MathUtils.clamp(targetPitch.current - (event.clientY - previousY) * 0.0024, -0.48, 0.3);
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
      fov.current = THREE.MathUtils.clamp(fov.current + event.deltaY * 0.018, 32, 72);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') targetYaw.current += 0.08;
      if (event.key === 'ArrowRight') targetYaw.current -= 0.08;
      if (event.key === 'ArrowUp') targetPitch.current = Math.min(0.3, targetPitch.current + 0.05);
      if (event.key === 'ArrowDown') targetPitch.current = Math.max(-0.48, targetPitch.current - 0.05);
      if (event.key === '+' || event.key === '=') fov.current = Math.max(32, fov.current - 6);
      if (event.key === '-' || event.key === '_') fov.current = Math.min(72, fov.current + 6);
      if (event.key === '0') { targetYaw.current = 0; targetPitch.current = -0.11; fov.current = 56; }
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    element.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', keydown);
    return () => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', keydown);
    };
  }, [gl]);

  useFrame(({ clock, camera: activeCamera }, delta) => {
    const damping = 1 - Math.exp(-delta * 7.5);
    yaw.current = THREE.MathUtils.lerp(yaw.current, targetYaw.current, damping);
    pitch.current = THREE.MathUtils.lerp(pitch.current, targetPitch.current, damping);
    activeCamera.rotation.order = 'YXZ';
    activeCamera.rotation.y = yaw.current;
    activeCamera.rotation.x = pitch.current;
    activeCamera.position.y = 3.15 + Math.sin(clock.elapsedTime * 1.35) * 0.018;
    const perspective = activeCamera as THREE.PerspectiveCamera;
    perspective.fov = THREE.MathUtils.lerp(perspective.fov, fov.current, damping);
    perspective.updateProjectionMatrix();
    telemetryTimer.current += delta;
    if (telemetryTimer.current > 0.08) {
      onTelemetry({
        heading: ((THREE.MathUtils.radToDeg(-yaw.current) % 360) + 360) % 360,
        pitch: THREE.MathUtils.radToDeg(pitch.current),
        fov: perspective.fov,
      });
      telemetryTimer.current = 0;
    }
  });
  return null;
}

function DreamerScene({ point, onReady, onTelemetry }: { point: MarsPoint; onReady: () => void; onTelemetry: (telemetry: LookTelemetry) => void }) {
  return (
    <>
      <color attach="background" args={['#160d0b']} />
      <fog attach="fog" args={['#9e5133', 48, 158]} />
      <MartianSky />
      <hemisphereLight args={['#ffd0b2', '#24100b', 1.35]} />
      <directionalLight position={[-32, 42, 18]} intensity={3.15} color="#ffd8b9" />
      <Suspense fallback={null}><DreamerTerrain point={point} onReady={onReady} /></Suspense>
      <DreamerDust />
      <DreamerLookController onTelemetry={onTelemetry} />
    </>
  );
}

export function DreamerSurface() {
  const dreamerPoint = useMarsStore((state) => state.dreamerPoint);
  const cameraPoint = useMarsStore((state) => state.cameraPoint);
  const exitDreamerView = useMarsStore((state) => state.exitDreamerView);
  const point = dreamerPoint ?? cameraPoint;
  const [sceneReady, setSceneReady] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [telemetry, setTelemetry] = useState<LookTelemetry>({ heading: 0, pitch: -6.3, fov: 56 });
  const [localTime, setLocalTime] = useState('--:--');
  const markReady = useCallback(() => setSceneReady(true), []);
  const updateTelemetry = useCallback((next: LookTelemetry) => setTelemetry(next), []);

  useEffect(() => {
    if (!sceneReady) return;
    const timer = window.setTimeout(() => setBootComplete(true), 1450);
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
    '--hud-x': `${THREE.MathUtils.clamp((telemetry.heading > 180 ? telemetry.heading - 360 : telemetry.heading) * -0.035, -7, 7)}px`,
    '--hud-y': `${THREE.MathUtils.clamp(telemetry.pitch * 0.12, -4, 4)}px`,
  } as CSSProperties;

  return (
    <section className={`dreamer-view${uiHidden ? ' ui-hidden' : ''}`} aria-label="Dreamer mode simulated Mars surface">
      <Canvas camera={{ position: [0, 3.15, 9], fov: 56, near: 0.05, far: 260 }} gl={{ antialias: true, powerPreference: 'high-performance' }} dpr={[1, 1.6]}>
        <DreamerScene point={point} onReady={markReady} onTelemetry={updateTelemetry} />
      </Canvas>

      <div className="dreamer-helmet" aria-hidden="true"><i /><b /><span /><em /></div>
      <div className="dreamer-glass" aria-hidden="true"><i /><b /><span /></div>
      <button className="dreamer-reveal" onClick={() => setUiHidden(false)}>RAISE HUD</button>

      <div className="dreamer-hud" style={hudMotion}>
        <header className="dreamer-topline">
          <div><strong>DREAMER</strong><span>EXTRAVEHICULAR SIMULATION</span></div>
          <p><i /> VISOR LINK · NOMINAL</p>
          <button onClick={exitDreamerView}>EXIT TO ORBIT ↑</button>
        </header>

        <div className="dreamer-compass" aria-label={`Heading ${heading} degrees`}>
          <small>W</small><i /><small>NW</small><i /><b>{heading}°</b><i /><small>NE</small><i /><small>E</small>
        </div>

        <aside className="dreamer-panel dreamer-suit">
          <p>SUIT / EVA 01</p>
          <h2>Life support</h2>
          <dl>
            <div><dt>OXYGEN</dt><dd>98<span>%</span></dd></div>
            <div><dt>PRESSURE</dt><dd>4.3<span>PSI</span></dd></div>
            <div><dt>HEART RATE</dt><dd>72<span>BPM</span></dd></div>
            <div><dt>SUIT POWER</dt><dd>87<span>%</span></dd></div>
          </dl>
          <div className="dreamer-gauge"><i style={{ width: '87%' }} /></div>
          <small>EST. EVA TIME · 06:42:18</small>
        </aside>

        <aside className="dreamer-panel dreamer-location">
          <p>NAV / SELECTED POINT</p>
          <h2>Uncharted surface</h2>
          <dl>
            <div><dt>LAT</dt><dd>{formatLatitude(point.latitude)}</dd></div>
            <div><dt>LON</dt><dd>{formatLongitude(point.longitude)}</dd></div>
            <div><dt>ELEV</dt><dd>{formatElevation(point.elevation)}</dd></div>
            <div><dt>LOCAL</dt><dd>{localTime} MTC</dd></div>
          </dl>
          <div className="dreamer-sim-label"><i /> SIMULATED TERRAIN INTERPRETATION</div>
        </aside>

        <div className="dreamer-reticle" aria-hidden="true"><span /><i /><b /></div>

        <div className="dreamer-attitude">
          <span>PITCH {telemetry.pitch >= 0 ? '+' : ''}{telemetry.pitch.toFixed(1)}°</span>
          <i />
          <span>FOV {Math.round(telemetry.fov)}°</span>
        </div>

        <footer className="dreamer-footer">
          <span>DRAG / SWIPE · LOOK</span><span>SCROLL / PINCH · VISOR ZOOM</span><span>H · HUD</span><span>F · {fullscreen ? 'WINDOW' : 'FULLSCREEN'}</span>
          <b>IMAGINED VIEW · NOT A ROVER PHOTOGRAPH</b>
        </footer>
      </div>

      {(!sceneReady || !bootComplete) && (
        <div className={`dreamer-boot${sceneReady ? ' online' : ''}`} role="status" aria-live="polite">
          <div className="dreamer-boot-mark">✦</div>
          <span>{sceneReady ? 'DREAMER VISOR ONLINE' : 'GENERATING LOCAL TERRAIN'}</span>
          <i><b /></i>
          <small>{sceneReady ? 'SIMULATION LAYER / READY' : `${formatLatitude(point.latitude)} · ${formatLongitude(point.longitude)}`}</small>
        </div>
      )}
    </section>
  );
}
