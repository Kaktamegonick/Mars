'use client';

import { useEffect, useState } from 'react';
import { useMarsStore } from '../stores/marsStore';
import { getRoverStation, ROVER_ROUTES } from '../data/roverStations';
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
  const terrainNotice = useMarsStore((state) => state.terrainNotice);
  const flight = useMarsStore((state) => state.flight);
  const orbitOut = useMarsStore((state) => state.orbitOut);
  const routeOverview = useMarsStore((state) => state.routeOverview);
  const viewPerseveranceRoute = useMarsStore((state) => state.viewPerseveranceRoute);
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
          <button className="route-button" disabled={Boolean(flight)} onClick={viewPerseveranceRoute}>↗ PERSEVERANCE PATH</button>
          <button className="surface-button" disabled={Boolean(flight)} onClick={() => visitStation(activeStationId)}>↓ DESCEND · {activeStation.rover.toUpperCase()}</button>
          <button className="orbit-button" disabled={Boolean(flight)} onClick={orbitOut} aria-label="Center the full globe">◎ CENTER GLOBE</button>
          <div className="live-pill locked"><i /> VERIFIED SITES ONLY</div>
        </div>
      </header>

      {!routeOverview && <section className="hero-copy">
        <p>ORBITAL CARTOGRAPHY / VERIFIED SURFACE ARCHIVE</p><h1>Touch the<br /><em>red planet.</em></h1>
        <span>Drag to rotate · choose a rover · descend into an authentic camera view</span>
        <div className="mission-path"><b>01</b><span>EXPLORE ORBIT</span><i /><b>02</b><span>CHOOSE ROVER SITE</span></div>
      </section>}

      {routeOverview && (
        <aside className="route-overview-card">
          <p className="panel-label">PERSEVERANCE / PUBLISHED DRIVE PATH</p>
          <h2>Landing → Airey Hill</h2>
          <p>The orange line follows the rover&apos;s recorded mobility waypoints from sol 0 through sol 960.</p>
          <ol>
            <li><span>01</span><b>Octavia E. Butler Landing</b><small>START · SOL 0</small></li>
            <li><span>02</span><b>Belva Crater</b><small>CAMERA STOP · SOL 772</small></li>
            <li><span>03</span><b>Airey Hill</b><small>CAMERA STOP · SOL 960</small></li>
          </ol>
          <button onClick={orbitOut}>× EXIT PATH VIEW</button>
        </aside>
      )}

      <button
        className="catalog-toggle"
        aria-expanded={catalogOpen}
        aria-controls="mission-index"
        onClick={() => setCatalogOpen((open) => !open)}
      >
        <b>CHOOSE ROVER</b><span>{ROVER_ROUTES.length.toString().padStart(2, '0')} MISSIONS · VERIFIED CAMERAS</span><i>{catalogOpen ? '×' : '+'}</i>
      </button>

      {catalogOpen && (
        <aside className="mission-drawer" id="mission-index" role="dialog" aria-modal="true" aria-label="Rover mission index">
          <div className="drawer-head"><p className="panel-label">ROVERS / CHRONOLOGICAL</p><button onClick={() => setCatalogOpen(false)} aria-label="Close mission index">×</button></div>
          <nav className="rover-sites" aria-label="Verified Mars rover routes">
            {ROVER_ROUTES.map((route, index) => {
              const firstStation = route.stations[0];
              const cameraStops = route.stations.filter((station) => station.image).length;
              const active = route.rover === activeStation.rover;
              return (
              <button key={route.rover} className={active ? 'active' : ''} aria-pressed={active} onClick={() => { setCatalogOpen(false); visitStation(firstStation.id); }}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <b>{route.rover} · {route.mission}</b>
                <small>{route.year} · {cameraStops} CAMERA STOP{cameraStops === 1 ? '' : 'S'} · {route.operator}</small>
              </button>
              );
            })}
            <i>SELECT A ROVER TO DESCEND DIRECTLY INTO ITS VERIFIED CAMERA ARCHIVE</i>
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

      <div className={`flight-status ${flight ? 'visible' : ''}`} role="status" aria-live="polite"><span /> {flight?.enterSurface ? 'DESCENDING TO VERIFIED ROVER SITE' : 'REPOSITIONING IN SAFE ORBIT'}</div>
      {terrainNotice > 0 && (
        <div key={terrainNotice} className="surface-notice" role="status">
          <span>DESCENT UNAVAILABLE</span>
          <b>WE HAVEN’T BEEN HERE YET</b>
          <small>CHOOSE A VERIFIED ROVER SITE TO REACH THE SURFACE</small>
        </div>
      )}
      <div className="scale"><span /> {altitude > 1_000_000 ? '1,000 KM' : altitude > 10_000 ? '10 KM' : altitude > 100 ? '100 M' : '10 M'}</div>
      <div className="orbit-controls-hint">DRAG TO ROTATE · SCROLL / PINCH TO ZOOM · CENTER GLOBE TO RESET</div>
      <div className="statusbar"><span>REGION: {routeOverview ? 'JEZERO DRIVE CORRIDOR' : selected ? 'SELECTED TERRAIN' : 'GLOBAL MARS'}</span><span>DESCENT: VERIFIED SITES ONLY</span><span>MODE: {routeOverview ? 'ROUTE OVERVIEW' : mode}</span><span>FPS: {fps}</span></div>
    </>
  );
}
