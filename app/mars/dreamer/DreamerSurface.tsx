'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { useMarsStore } from '../stores/marsStore';
import { formatElevation, formatLatitude, formatLongitude } from '../utils/coordinates';

const DREAMER_PANORAMA = '/mars-data/dreamer-mars-360-dusty.png';

type LookTelemetry = { heading: number; pitch: number; fov: number };
type WindParticle = { x: number; y: number; speed: number; drift: number; length: number; size: number; alpha: number };
type VisorParticle = { angle: number; distance: number; depth: number; speed: number; size: number; alpha: number };
type NearParticle = { x: number; y: number; velocityX: number; velocityY: number; size: number; alpha: number; life: number; maxLife: number };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function DreamerPanoramaTexture({ onReady }: { onReady: () => void }) {
  const loadedTexture = useLoader(THREE.TextureLoader, DREAMER_PANORAMA);
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

function DreamerPanorama({ onReady, onTelemetry }: { onReady: () => void; onTelemetry: (telemetry: LookTelemetry) => void }) {
  const dustCanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = dustCanvas.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame = 0;
    let previousTime = performance.now();
    let width = 1;
    let height = 1;
    let wind: WindParticle[] = [];
    let visor: VisorParticle[] = [];
    let near: NearParticle[] = [];

    const resetNearParticle = (particle: NearParticle, stagger = false) => {
      const fromLeft = Math.random() > 0.5;
      const upperEdge = Math.random() > 0.54;
      particle.x = fromLeft ? -20 - Math.random() * 60 : width + 20 + Math.random() * 60;
      particle.y = upperEdge ? Math.random() * height * 0.25 : height * (0.72 + Math.random() * 0.28);
      particle.velocityX = (fromLeft ? 1 : -1) * (34 + Math.random() * 62);
      particle.velocityY = -13 + Math.random() * 26;
      particle.size = 2.4 + Math.random() * 5.6;
      particle.alpha = 0.055 + Math.random() * 0.1;
      particle.maxLife = 3.8 + Math.random() * 4.5;
      particle.life = stagger ? Math.random() * particle.maxLife : 0;
    };

    const createParticles = () => {
      const density = clamp(Math.floor((width * height) / 10_500), 68, 150);
      wind = Array.from({ length: density }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 45 + Math.random() * 120,
        drift: -9 + Math.random() * 20,
        length: 5 + Math.random() * 23,
        size: 0.35 + Math.random() * 1.05,
        alpha: 0.035 + Math.random() * 0.16,
      }));
      visor = Array.from({ length: Math.round(density * 0.2) }, () => ({
        angle: Math.random() * Math.PI * 2,
        distance: 12 + Math.random() * Math.min(width, height) * 0.34,
        depth: Math.random(),
        speed: 0.13 + Math.random() * 0.28,
        size: 0.45 + Math.random() * 1.15,
        alpha: 0.08 + Math.random() * 0.18,
      }));
      near = Array.from({ length: 7 }, () => {
        const particle: NearParticle = { x: 0, y: 0, velocityX: 0, velocityY: 0, size: 0, alpha: 0, life: 0, maxLife: 1 };
        resetNearParticle(particle, true);
        return particle;
      });
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      createParticles();
    };

    const draw = (time: number) => {
      if (motionQuery.matches) {
        context.clearRect(0, 0, width, height);
        return;
      }

      const delta = Math.min((time - previousTime) / 1000, 0.04);
      previousTime = time;
      context.clearRect(0, 0, width, height);
      context.lineCap = 'round';

      for (const particle of wind) {
        particle.x += particle.speed * delta;
        particle.y += particle.drift * delta;
        if (particle.x > width + particle.length || particle.y < -12 || particle.y > height + 12) {
          particle.x = -particle.length - Math.random() * width * 0.08;
          particle.y = Math.random() * height;
        }
        const fade = 0.42 + Math.sin(time * 0.0007 + particle.y) * 0.14;
        context.strokeStyle = `rgba(218, 167, 125, ${particle.alpha * fade})`;
        context.lineWidth = particle.size;
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(particle.x - particle.length, particle.y - particle.drift * 0.025);
        context.stroke();
      }

      const centreX = width * 0.5;
      const centreY = height * 0.48;
      for (const particle of visor) {
        particle.depth += particle.speed * delta;
        if (particle.depth > 1) {
          particle.depth = 0.03;
          particle.angle = Math.random() * Math.PI * 2;
          particle.distance = 12 + Math.random() * Math.min(width, height) * 0.34;
        }
        const expansion = 0.55 + particle.depth * particle.depth * 3.2;
        const x = centreX + Math.cos(particle.angle) * particle.distance * expansion;
        const y = centreY + Math.sin(particle.angle) * particle.distance * expansion * 0.72;
        const radius = particle.size * (0.4 + particle.depth * 2.7);
        context.fillStyle = `rgba(238, 190, 148, ${particle.alpha * particle.depth})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }

      for (const particle of near) {
        particle.life += delta;
        particle.x += particle.velocityX * delta;
        particle.y += particle.velocityY * delta;
        if (particle.life > particle.maxLife || particle.x < -100 || particle.x > width + 100) resetNearParticle(particle);
        const lifeProgress = particle.life / particle.maxLife;
        const opacity = Math.sin(Math.min(1, lifeProgress) * Math.PI) * particle.alpha;
        const gradient = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 1.8);
        gradient.addColorStop(0, `rgba(238, 196, 157, ${opacity})`);
        gradient.addColorStop(0.42, `rgba(174, 116, 80, ${opacity * 0.48})`);
        gradient.addColorStop(1, 'rgba(120, 78, 56, 0)');
        context.fillStyle = gradient;
        context.beginPath();
        context.ellipse(particle.x, particle.y, particle.size * 1.8, particle.size, particle.velocityY * 0.015, 0, Math.PI * 2);
        context.fill();
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    const restart = () => {
      window.cancelAnimationFrame(animationFrame);
      previousTime = performance.now();
      if (!motionQuery.matches && !document.hidden) animationFrame = window.requestAnimationFrame(draw);
      else context.clearRect(0, 0, width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    restart();
    motionQuery.addEventListener('change', restart);
    document.addEventListener('visibilitychange', restart);

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener('change', restart);
      document.removeEventListener('visibilitychange', restart);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="dreamer-panorama" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 0.001], fov: 58, near: 0.01, far: 30 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#8a4f37']} />
        <Suspense fallback={null}><DreamerPanoramaTexture onReady={onReady} /></Suspense>
        <DreamerLookController onTelemetry={onTelemetry} />
      </Canvas>
      <div className="dreamer-distance-haze" />
      <div className="dreamer-dust-haze" />
      <canvas ref={dustCanvas} className="dreamer-dust" />
      <div className="dreamer-edge-depth" />
      <div className="dreamer-visor-optics" />
    </div>
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
    <section className={`dreamer-view${uiHidden ? ' ui-hidden' : ''}${fullscreen ? ' is-fullscreen' : ''}`} aria-label="Dreamer mode imagined Mars surface">
      <DreamerPanorama onReady={markReady} onTelemetry={updateTelemetry} />

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
