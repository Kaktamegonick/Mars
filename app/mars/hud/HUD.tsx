'use client';

import { useMarsStore } from '../stores/marsStore';
import { formatDistance, formatElevation, formatLatitude, formatLongitude } from '../utils/coordinates';

export function HUD() {
  const cameraPoint = useMarsStore((state) => state.cameraPoint);
  const hover = useMarsStore((state) => state.hover);
  const selected = useMarsStore((state) => state.selected);
  const altitude = useMarsStore((state) => state.altitude);
  const zoom = useMarsStore((state) => state.zoom);
  const mode = useMarsStore((state) => state.mode);
  const fps = useMarsStore((state) => state.fps);
  const flight = useMarsStore((state) => state.flight);
  const orbitOut = useMarsStore((state) => state.orbitOut);
  const enterSurfaceView = useMarsStore((state) => state.enterSurfaceView);

  return (
    <>
      <header className="topbar">
        <div className="wordmark"><span className="mission-mark">M</span><div><b>MARS</b><small>EXPLORER / MISSION 01</small></div></div>
        <div className="top-actions">
          <button className="surface-button" onClick={enterSurfaceView}>↓ ROVER VIEW</button>
          <button className="orbit-button" onClick={orbitOut} aria-label="Return to orbit">↑ ORBIT</button>
          <div className="live-pill"><i /> LIVE TERRAIN</div>
        </div>
      </header>

      <section className="hero-copy">
        <p>MRO / MGS DATASET</p><h1>Touch the<br />red planet.</h1>
        <span>Drag to orbit · scroll to descend · click terrain for rover view</span>
      </section>

      <aside className="telemetry">
        <p className="panel-label">NAV / JEZERO</p>
        <dl>
          <div><dt>LATITUDE</dt><dd>{formatLatitude(cameraPoint.latitude)}</dd></div>
          <div><dt>LONGITUDE</dt><dd>{formatLongitude(cameraPoint.longitude)}</dd></div>
          <div><dt>ELEVATION</dt><dd>{formatElevation(cameraPoint.elevation)}</dd></div>
          <div><dt>ALTITUDE</dt><dd>{formatDistance(altitude)}</dd></div>
          <div><dt>ZOOM LEVEL</dt><dd>{zoom.toFixed(1)}×</dd></div>
        </dl>
        <div className="data-source"><span>MOLA / MGS</span><span>GLOBAL DTM</span></div>
      </aside>

      {hover && (
        <aside className="target-readout">
          <p className="panel-label">TARGET</p>
          <dl><div><dt>LAT</dt><dd>{formatLatitude(hover.latitude)}</dd></div><div><dt>LON</dt><dd>{formatLongitude(hover.longitude)}</dd></div><div><dt>ELEVATION</dt><dd>{formatElevation(hover.elevation)}</dd></div><div><dt>DISTANCE</dt><dd>{formatDistance(hover.distance ?? 0)}</dd></div></dl>
        </aside>
      )}

      <div className={`flight-status ${flight ? 'visible' : ''}`}><span /> DESCENDING TO ROVER STATION</div>
      <div className="scale"><span /> {altitude > 1_000_000 ? '1,000 KM' : altitude > 10_000 ? '10 KM' : altitude > 100 ? '100 M' : '10 M'}</div>
      <div className="statusbar"><span>REGION: {selected ? 'SELECTED TERRAIN' : 'JEZERO CRATER'}</span><span>MODE: {mode}</span><span>FPS: {fps}</span></div>
    </>
  );
}
