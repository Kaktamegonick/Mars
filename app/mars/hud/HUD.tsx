'use client';

import { useEffect, useState } from 'react';
import { useMarsStore } from '../stores/marsStore';
import { getRoverStation, ROVER_STATIONS } from '../data/roverStations';
import { formatDistance, formatElevation, formatLatitude, formatLongitude } from '../utils/coordinates';

export function HUD() {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const cameraPoint = useMarsStore((state) => state.cameraPoint);
  const hover = useMarsStore((state) => state.hover);
  const selected = useMarsStore((state) => state.selected);
  const altitude = useMarsStore((state) => state.altitude);
  const zoom = useMarsStore((state) => state.zoom);
  const mode = useMarsStore((state) => state.mode);
  const fps = useMarsStore((state) => state.fps);
  const flight = useMarsStore((state) => state.flight);
  const orbitOut = useMarsStore((state) => state.orbitOut);
  const activeStationId = useMarsStore((state) => state.activeStationId);
  const visitStation = useMarsStore((state) => state.visitStation);
  const activeStation = getRoverStation(activeStationId);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCatalogOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="wordmark"><span className="mission-mark">M</span><div><b>MARS</b><small>EXPLORER / MISSION 01</small></div></div>
        <div className="top-actions">
          <button className="surface-button" onClick={() => visitStation(activeStationId)}>↓ DESCEND · {activeStation.rover.toUpperCase()}</button>
          <button className="orbit-button" onClick={orbitOut} aria-label="Return to orbit">↑ ORBIT</button>
          <div className="live-pill locked"><i /> DESCENT LOCKED</div>
        </div>
      </header>

      <section className="hero-copy">
        <p>ORBITAL CARTOGRAPHY / VERIFIED SURFACE ARCHIVE</p><h1>Touch the<br /><em>red planet.</em></h1>
        <span>Orbit anywhere · surface descent only at verified rover sites</span>
        <div className="mission-path"><b>01</b><span>EXPLORE ORBIT</span><i /><b>02</b><span>CHOOSE ROVER SITE</span></div>
      </section>

      <button
        className="catalog-toggle"
        aria-expanded={catalogOpen}
        aria-controls="mission-index"
        onClick={() => setCatalogOpen((open) => !open)}
      >
        <b>CHOOSE ROVER SITE</b><span>{ROVER_STATIONS.length.toString().padStart(2, '0')} VERIFIED DESCENT POINTS</span><i>{catalogOpen ? '×' : '+'}</i>
      </button>

      {catalogOpen && (
        <aside className="mission-drawer" id="mission-index">
          <div className="drawer-head"><p className="panel-label">ROVERS / VERIFIED ARCHIVE</p><button onClick={() => setCatalogOpen(false)} aria-label="Close mission index">×</button></div>
          <nav className="rover-sites" aria-label="Verified Mars rover surface stations">
            {ROVER_STATIONS.map((station, index) => (
              <button key={station.id} className={station.id === activeStationId ? 'active' : ''} onClick={() => { setCatalogOpen(false); visitStation(station.id); }}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <b>{station.rover} · {station.name}</b>
                <small>{station.year} · {formatLatitude(station.latitude)} · {station.status}</small>
              </button>
            ))}
            <i>EVERY IMAGE IS ATTRIBUTED TO THE CAMERA THAT ACTUALLY CAPTURED IT</i>
          </nav>

          <section className="orbit-legend">
            <p className="panel-label">MRO / REFERENCE ORBIT</p>
            <div><span className="orbit-swatch" /> <b>255–320 KM · 92.7°</b></div>
            <small>NEAR-POLAR SCIENCE ORBIT · 112 MIN<br />ANIMATED AT ACCELERATED SPEED</small>
            <a href="https://science.nasa.gov/wp-content/uploads/2024/03/44745_mro-arrival.pdf" target="_blank" rel="noreferrer">NASA ORBIT SOURCE ↗</a>
          </section>

          <section className="telemetry">
            <p className="panel-label">NAV / GLOBAL</p>
            <dl>
              <div><dt>LATITUDE</dt><dd>{formatLatitude(cameraPoint.latitude)}</dd></div>
              <div><dt>LONGITUDE</dt><dd>{formatLongitude(cameraPoint.longitude)}</dd></div>
              <div><dt>ELEVATION</dt><dd>{formatElevation(cameraPoint.elevation)}</dd></div>
              <div><dt>ALTITUDE</dt><dd>{formatDistance(altitude)}</dd></div>
              <div><dt>ZOOM LEVEL</dt><dd>{zoom.toFixed(1)}×</dd></div>
            </dl>
            <div className="data-source"><span>MOLA / MGS</span><span>GLOBAL DTM</span></div>
          </section>
        </aside>
      )}

      {hover && (
        <aside className="target-readout">
          <p className="panel-label">ORBITAL TARGET / DESCENT LOCKED</p>
          <dl><div><dt>LAT</dt><dd>{formatLatitude(hover.latitude)}</dd></div><div><dt>LON</dt><dd>{formatLongitude(hover.longitude)}</dd></div><div><dt>ELEVATION</dt><dd>{formatElevation(hover.elevation)}</dd></div><div><dt>DISTANCE</dt><dd>{formatDistance(hover.distance ?? 0)}</dd></div></dl>
        </aside>
      )}

      <div className={`flight-status ${flight ? 'visible' : ''}`}><span /> {flight?.enterSurface ? 'DESCENDING TO VERIFIED ROVER SITE' : 'REPOSITIONING IN SAFE ORBIT'}</div>
      <div className="scale"><span /> {altitude > 1_000_000 ? '1,000 KM' : altitude > 10_000 ? '10 KM' : altitude > 100 ? '100 M' : '10 M'}</div>
      <div className="statusbar"><span>REGION: {selected ? 'SELECTED TERRAIN' : 'GLOBAL MARS'}</span><span>DESCENT: VERIFIED SITES ONLY</span><span>MODE: {mode}</span><span>FPS: {fps}</span></div>
    </>
  );
}
