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
  const patchSpan = 0.16;

  const { geometry, color, detail, rocks, rockGeometry, rockMaterials } = useMemo(() => {
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

    const detailCanvas = document.createElement('canvas');
    detailCanvas.width = 256;
    detailCanvas.height = 256;
    const detailContext = detailCanvas.getContext('2d');
    const detailPixels = detailContext?.createImageData(detailCanvas.width, detailCanvas.height);
    const seed = point.latitude * 17.13 + point.longitude * 31.71;
    if (detailPixels && detailContext) {
      for (let index = 0; index < detailPixels.data.length; index += 4) {
        const grain = 76 + Math.floor(pseudoRandom(index * 0.73 + seed) * 118);
        detailPixels.data[index] = grain;
        detailPixels.data[index + 1] = grain;
        detailPixels.data[index + 2] = grain;
        detailPixels.data[index + 3] = 255;
      }
      detailContext.putImageData(detailPixels, 0, 0);
    }
    const detailTexture = new THREE.CanvasTexture(detailCanvas);
    detailTexture.wrapS = THREE.RepeatWrapping;
    detailTexture.wrapT = THREE.RepeatWrapping;
    detailTexture.repeat.set(28, 28);

    const terrain = new THREE.PlaneGeometry(340, 340, 196, 196);
    terrain.rotateX(-Math.PI / 2);
    const positions = terrain.getAttribute('position') as THREE.BufferAttribute;
    const centerHeight = pixels ? samplePixel(pixels, canvas.width, canvas.height, centerU, centerVImage) : 128;
    const craters = Array.from({ length: 14 }, (_, index) => ({
      x: (pseudoRandom(index * 4.11 + seed) - 0.5) * 250,
      z: -18 - pseudoRandom(index * 7.23 - seed) * 132,
      radius: 3 + pseudoRandom(index * 9.37 + seed) * 8,
      depth: 0.35 + pseudoRandom(index * 2.81 - seed) * 1.15,
    }));

    const terrainHeightAt = (x: number, z: number) => {
      const u = centerU + (x / 340) * patchSpan;
      const v = centerVImage - (z / 340) * patchSpan;
      const sourceHeight = pixels ? samplePixel(pixels, canvas.width, canvas.height, u, v) : centerHeight;
      const sourceRelief = ((sourceHeight - centerHeight) / 255) * 12;
      const forward = -z;
      const fineRelief = Math.sin(x * 0.17 + seed) * 0.28
        + Math.cos(z * 0.14 - seed) * 0.24
        + Math.sin((x + z) * 0.33 + seed * 0.4) * 0.11;
      const erodedBands = Math.sin(x * 0.038 + seed) * Math.cos(z * 0.026 - seed) * 1.05;
      const eastRamp = THREE.MathUtils.smoothstep(x, 27, 118);
      const eastWall = Math.pow(eastRamp, 1.55) * THREE.MathUtils.smoothstep(forward, -18, 62)
        * (18 + Math.abs(Math.sin(z * 0.037 + seed)) * 11 + Math.abs(Math.sin(x * 0.082 - z * 0.014)) * 6);
      const westRamp = THREE.MathUtils.smoothstep(-x, 55, 148);
      const westWall = westRamp * THREE.MathUtils.smoothstep(forward, -8, 78)
        * (8 + Math.abs(Math.sin(z * 0.044 - seed)) * 6);
      const distantRidge = THREE.MathUtils.smoothstep(forward, 88, 162)
        * (2 + Math.abs(Math.sin(x * 0.029 + seed)) * 3.5);
      let craterRelief = 0;
      for (const crater of craters) {
        const distance = Math.hypot(x - crater.x, z - crater.z);
        const normalized = distance / crater.radius;
        if (normalized < 1) craterRelief -= (1 - normalized * normalized) * crater.depth;
        else if (normalized < 1.32) craterRelief += Math.sin(((normalized - 1) / 0.32) * Math.PI) * crater.depth * 0.28;
      }
      const cameraClearance = THREE.MathUtils.smoothstep(Math.hypot(x, z - 9), 3, 19);
      return (sourceRelief + fineRelief + erodedBands + eastWall + westWall + distantRidge + craterRelief) * cameraClearance;
    };

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      positions.setY(index, terrainHeightAt(x, z));
    }
    positions.needsUpdate = true;
    terrain.computeVertexNormals();

    const scatteredRocks = Array.from({ length: 118 }, (_, index) => {
      const z = 4 - Math.pow(pseudoRandom(index * 5.17 + seed), 0.72) * 152;
      const spread = 38 + Math.max(0, -z) * 0.72;
      let x = (pseudoRandom(index * 8.31 - seed) - 0.5) * spread * 2;
      if (Math.hypot(x, z - 9) < 9) x += x > 0 ? 10 : -10;
      let scale = 0.2 + Math.pow(pseudoRandom(index * 3.43 + seed), 2.1) * 1.55;
      if (z > -60 && Math.abs(x) < 38) scale = Math.min(scale, 0.38);
      return {
        position: [x, terrainHeightAt(x, z) + scale * 0.36, z] as [number, number, number],
        rotation: [pseudoRandom(index + 4) * 0.5, pseudoRandom(index + 9) * Math.PI, pseudoRandom(index + 12) * 0.5] as [number, number, number],
        scale: [scale * (1.1 + pseudoRandom(index * 1.7) * 0.65), scale * (0.52 + pseudoRandom(index * 2.1) * 0.38), scale] as [number, number, number],
        material: index % 3,
      };
    });
    const cliffOutcrops = Array.from({ length: 42 }, (_, index) => {
      const z = -28 - pseudoRandom(index * 6.37 + seed) * 128;
      const x = 52 + pseudoRandom(index * 3.91 - seed) * 76;
      const scale = 1.35 + pseudoRandom(index * 8.13 + seed) * 3.9;
      return {
        position: [x, terrainHeightAt(x, z) + scale * 0.12, z] as [number, number, number],
        rotation: [pseudoRandom(index + 17) * 0.35, pseudoRandom(index + 23) * Math.PI, pseudoRandom(index + 29) * 0.35] as [number, number, number],
        scale: [scale * 1.5, scale * 0.86, scale] as [number, number, number],
        material: (index + 1) % 3,
      };
    });
    const surfaceRocks = [...scatteredRocks, ...cliffOutcrops];
    const sharedRockGeometry = new THREE.DodecahedronGeometry(1, 1);
    const sharedRockMaterials = ['#814229', '#a05b38', '#653221'].map((rockColor) => new THREE.MeshStandardMaterial({ color: rockColor, roughness: 1, flatShading: true }));
    return {
      geometry: terrain,
      color: texture,
      detail: detailTexture,
      rocks: surfaceRocks,
      rockGeometry: sharedRockGeometry,
      rockMaterials: sharedRockMaterials,
    };
  }, [centerU, centerVImage, centerVTexture, elevation.image, loadedColor, patchSpan, point.latitude, point.longitude]);

  useEffect(() => {
    const frame = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(frame);
  }, [geometry, onReady]);

  useEffect(() => () => {
    geometry.dispose();
    color.dispose();
    detail.dispose();
    rockGeometry.dispose();
    rockMaterials.forEach((material) => material.dispose());
  }, [color, detail, geometry, rockGeometry, rockMaterials]);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial map={color} bumpMap={detail} bumpScale={0.7} color="#b97d5b" roughness={1} metalness={0} />
      </mesh>
      {rocks.map((rock, index) => (
        <mesh key={index} geometry={rockGeometry} material={rockMaterials[rock.material]} position={rock.position} rotation={rock.rotation} scale={rock.scale} />
      ))}
    </group>
  );
}

function DreamerDust() {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(520 * 3);
    for (let index = 0; index < 520; index += 1) {
      positions[index * 3] = (pseudoRandom(index * 2.1) - 0.5) * 180;
      positions[index * 3 + 1] = 0.2 + Math.pow(pseudoRandom(index * 4.7), 2.4) * 6;
      positions[index * 3 + 2] = (pseudoRandom(index * 7.3) - 0.5) * 180;
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
      <pointsMaterial color="#efad7d" size={0.032} transparent opacity={0.2} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function MartianSky() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      horizonColor: { value: new THREE.Color('#e39a67') },
      zenithColor: { value: new THREE.Color('#9d5134') },
      sunColor: { value: new THREE.Color('#ffe8c8') },
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
        float height = clamp(vDirection.y * 0.78 + 0.24, 0.0, 1.0);
        float gradient = smoothstep(0.04, 0.88, height);
        vec3 color = mix(horizonColor, zenithColor, gradient);
        float horizonHaze = pow(1.0 - max(vDirection.y, 0.0), 4.0) * 0.1;
        color += sunColor * horizonHaze;
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

function MartianSun() {
  const { texture, material } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      const glow = context.createRadialGradient(128, 128, 0, 128, 128, 128);
      glow.addColorStop(0, 'rgba(255, 250, 224, 1)');
      glow.addColorStop(0.08, 'rgba(255, 244, 211, 1)');
      glow.addColorStop(0.13, 'rgba(255, 216, 166, .72)');
      glow.addColorStop(0.34, 'rgba(255, 174, 111, .18)');
      glow.addColorStop(1, 'rgba(255, 153, 92, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, 256, 256);
    }
    const sunTexture = new THREE.CanvasTexture(canvas);
    const sunMaterial = new THREE.SpriteMaterial({ map: sunTexture, transparent: true, depthWrite: false, depthTest: false, toneMapped: false });
    return { texture: sunTexture, material: sunMaterial };
  }, []);

  useEffect(() => () => {
    texture.dispose();
    material.dispose();
  }, [material, texture]);

  return <sprite position={[-24, 26, -180]} scale={[34, 34, 1]} material={material} renderOrder={-4} />;
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
      <color attach="background" args={['#9d5134']} />
      <fog attach="fog" args={['#c4774e', 72, 245]} />
      <MartianSky />
      <MartianSun />
      <hemisphereLight args={['#ffd4ae', '#28100a', 1.42]} />
      <directionalLight position={[-18, 30, -58]} intensity={2.7} color="#ffd6ad" />
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
          <b>{heading}°</b>
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
          <span>DRAG / SWIPE · LOOK</span><span>SCROLL / PINCH · ZOOM</span><span>H · HUD</span><span>F · {fullscreen ? 'WINDOW' : 'FULLSCREEN'}</span>
          <b>SIMULATED VIEW · NOT A ROVER PHOTOGRAPH</b>
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
