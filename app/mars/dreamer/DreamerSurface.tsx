'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { useMarsStore } from '../stores/marsStore';
import { formatElevation, formatLatitude, formatLongitude } from '../utils/coordinates';

const DREAMER_PHOTO = '/mars-data/dreamer-mars-photo.png';

type LookTelemetry = { heading: number; pitch: number; fov: number };
type PhotoView = { x: number; y: number; zoom: number };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function DreamerPhoto({ onReady, onTelemetry }: { onReady: () => void; onTelemetry: (telemetry: LookTelemetry) => void }) {
  const [view, setView] = useState<PhotoView>({ x: 0, y: 0, zoom: 1.045 });
  const drag = useRef({ active: false, x: 0, y: 0 });

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
    onTelemetry({
      heading: (225 + view.x * 2.4 + 360) % 360,
      pitch: view.y * -1.7,
      fov: 58 - (view.zoom - 1.045) * 92,
    });
  }, [onTelemetry, view]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setView((current) => ({ ...current, x: clamp(current.x + 0.7, -4.5, 4.5) }));
      if (event.key === 'ArrowRight') setView((current) => ({ ...current, x: clamp(current.x - 0.7, -4.5, 4.5) }));
      if (event.key === 'ArrowUp') setView((current) => ({ ...current, y: clamp(current.y + 0.5, -2.6, 2.6) }));
      if (event.key === 'ArrowDown') setView((current) => ({ ...current, y: clamp(current.y - 0.5, -2.6, 2.6) }));
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
      x: clamp(current.x + deltaX * 0.012, -4.5, 4.5),
      y: clamp(current.y + deltaY * 0.01, -2.6, 2.6),
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
    '--photo-x': `${view.x}%`,
    '--photo-y': `${view.y}%`,
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
    />
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
