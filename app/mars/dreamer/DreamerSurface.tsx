'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { useMarsStore } from '../stores/marsStore';
import { formatElevation, formatLatitude, formatLongitude } from '../utils/coordinates';

const DREAMER_PHOTO = '/mars-data/dreamer-mars-photo.png';

type LookTelemetry = { heading: number; pitch: number; fov: number };
type PhotoView = { x: number; y: number; zoom: number };
type WindParticle = { x: number; y: number; speed: number; drift: number; length: number; size: number; alpha: number };
type VisorParticle = { angle: number; distance: number; depth: number; speed: number; size: number; alpha: number };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function DreamerPhoto({ onReady, onTelemetry }: { onReady: () => void; onTelemetry: (telemetry: LookTelemetry) => void }) {
  const [view, setView] = useState<PhotoView>({ x: 0, y: 0, zoom: 1.045 });
  const drag = useRef({ active: false, x: 0, y: 0 });
  const dustCanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    const image = new Image();
    const ready = () => { if (active) onReady(); };
    image.onload = ready;
    image.onerror = ready;
    image.src = DREAMER_PHOTO;
    if (image.complete) ready();
    return () => { active = false; };
  }, [onReady]);

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
        context.strokeStyle = `rgba(244, 174, 116, ${particle.alpha * fade})`;
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
        context.fillStyle = `rgba(255, 196, 137, ${particle.alpha * particle.depth})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    const restart = () => {
      window.cancelAnimationFrame(animationFrame);
      previousTime = performance.now();
      if (!motionQuery.matches) animationFrame = window.requestAnimationFrame(draw);
      else context.clearRect(0, 0, width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    restart();
    motionQuery.addEventListener('change', restart);

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener('change', restart);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    onTelemetry({
      heading: (225 + view.x * 2.4 + 360) % 360,
      pitch: view.y * -1.7,
      fov: 58 - (view.zoom - 1.045) * 92,
    });
  }, [onTelemetry, view]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setView((current) => ({ ...current, x: clamp(current.x + 0.45, -2.4, 2.4) }));
      if (event.key === 'ArrowRight') setView((current) => ({ ...current, x: clamp(current.x - 0.45, -2.4, 2.4) }));
      if (event.key === 'ArrowUp') setView((current) => ({ ...current, y: clamp(current.y + 0.32, -1.5, 1.5) }));
      if (event.key === 'ArrowDown') setView((current) => ({ ...current, y: clamp(current.y - 0.32, -1.5, 1.5) }));
      if (event.key === '+' || event.key === '=') setView((current) => ({ ...current, zoom: clamp(current.zoom + 0.025, 1.045, 1.17) }));
      if (event.key === '-' || event.key === '_') setView((current) => ({ ...current, zoom: clamp(current.zoom - 0.025, 1.045, 1.17) }));
      if (event.key === '0') setView({ x: 0, y: 0, zoom: 1.045 });
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = { active: true, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const deltaX = event.clientX - drag.current.x;
    const deltaY = event.clientY - drag.current.y;
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
    setView((current) => ({
      ...current,
      x: clamp(current.x + deltaX * 0.007, -2.4, 2.4),
      y: clamp(current.y + deltaY * 0.006, -1.5, 1.5),
    }));
  };

  const stopDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    drag.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const zoomPhoto = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setView((current) => ({ ...current, zoom: clamp(current.zoom + event.deltaY * 0.00028, 1.045, 1.17) }));
  };

  const photoStyle = {
    '--photo-far-x': `${view.x * 0.18}%`,
    '--photo-far-y': `${view.y * 0.14}%`,
    '--photo-mid-x': `${view.x * 0.5}%`,
    '--photo-mid-y': `${view.y * 0.38}%`,
    '--photo-near-x': `${view.x}%`,
    '--photo-near-y': `${view.y * 0.72}%`,
    '--photo-scale': view.zoom,
  } as CSSProperties;

  return (
    <div
      className="dreamer-photo"
      style={photoStyle}
      aria-hidden="true"
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onWheel={zoomPhoto}
    >
      <div className="dreamer-photo-layer dreamer-photo-far" />
      <div className="dreamer-photo-layer dreamer-photo-mid" />
      <div className="dreamer-photo-layer dreamer-photo-near" />
      <div className="dreamer-dust-haze" />
      <canvas ref={dustCanvas} className="dreamer-dust" />
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
    <section className={`dreamer-view${uiHidden ? ' ui-hidden' : ''}`} aria-label="Dreamer mode imagined Mars surface">
      <DreamerPhoto onReady={markReady} onTelemetry={updateTelemetry} />

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
          <span>DRAG / SWIPE · PARALLAX</span><span>SCROLL · ZOOM</span><span>H · HUD</span><span>F · {fullscreen ? 'WINDOW' : 'FULLSCREEN'}</span>
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
