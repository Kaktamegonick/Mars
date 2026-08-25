import { create } from 'zustand';
import * as THREE from 'three';
import { getRoverStation, stationPosition, type RoverStation } from '../data/roverStations';

export type MarsPoint = {
  position: THREE.Vector3;
  latitude: number;
  longitude: number;
  elevation: number;
  distance?: number;
};

type Flight = {
  destination: THREE.Vector3;
  requestedAt: number;
  quick: boolean;
  desiredAltitude?: number;
  enterSurface?: boolean;
  regionalOverview?: boolean;
  focusTarget?: THREE.Vector3;
};

type MarsState = {
  surfaceView: boolean;
  routeOverview: boolean;
  activeStationId: RoverStation['id'];
  hover: MarsPoint | null;
  selected: MarsPoint | null;
  cameraPoint: MarsPoint;
  altitude: number;
  zoom: number;
  mode: string;
  fps: number;
  terrainNotice: number;
  flight: Flight | null;
  setHover: (point: MarsPoint | null) => void;
  select: (point: MarsPoint, quick?: boolean) => void;
  rejectTerrainVisit: () => void;
  orbitOut: () => void;
  viewPerseveranceRoute: () => void;
  setTelemetry: (payload: Partial<Pick<MarsState, 'cameraPoint' | 'altitude' | 'zoom' | 'mode' | 'fps'>>) => void;
  clearFlight: () => void;
  enterSurfaceView: () => void;
  exitSurfaceView: () => void;
  visitStation: (id: RoverStation['id']) => void;
};

const JEZERO = { position: new THREE.Vector3(), latitude: 18.38, longitude: 77.58, elevation: -2620 };

export const useMarsStore = create<MarsState>((set) => ({
  hover: null,
  selected: null,
  cameraPoint: JEZERO,
  altitude: 12480000,
  zoom: 1,
  mode: 'ORBITAL',
  fps: 60,
  terrainNotice: 0,
  flight: null,
  surfaceView: false,
  routeOverview: false,
  activeStationId: 'airey',
  setHover: (hover) => set({ hover }),
  select: (selected, quick = false) => set({ selected, routeOverview: false, flight: { destination: selected.position.clone(), requestedAt: performance.now(), quick } }),
  rejectTerrainVisit: () => set({ terrainNotice: performance.now() }),
  orbitOut: () => set((state) => ({
    routeOverview: false,
    selected: null,
    flight: {
      destination: state.cameraPoint.position.clone(),
      focusTarget: new THREE.Vector3(),
      requestedAt: performance.now(),
      quick: false,
      desiredAltitude: 4_800_000,
    },
  })),
  viewPerseveranceRoute: () => {
    const landing = getRoverStation('perseverance-landing');
    const airey = getRoverStation('airey');
    const start = stationPosition(landing);
    const end = stationPosition(airey);
    const routeRadius = start.length();
    const destination = start.add(end).normalize().multiplyScalar(routeRadius);
    set({
      activeStationId: landing.id,
      selected: { position: stationPosition(landing), latitude: landing.latitude, longitude: landing.longitude, elevation: 0 },
      surfaceView: false,
      routeOverview: true,
      flight: {
        destination,
        requestedAt: performance.now(),
        quick: false,
        desiredAltitude: 45_000,
        regionalOverview: true,
      },
    });
  },
  setTelemetry: (payload) => set(payload),
  clearFlight: () => set({ flight: null }),
  enterSurfaceView: () => set({ surfaceView: true, routeOverview: false, flight: null, mode: 'ROVER' }),
  exitSurfaceView: () => set({ surfaceView: false, routeOverview: false, mode: 'ORBITAL', altitude: 1_800_000 }),
  visitStation: (id) => {
    const station = getRoverStation(id);
    const position = stationPosition(station);
    const selected = { position, latitude: station.latitude, longitude: station.longitude, elevation: 0 };
    set((state) => state.surfaceView
      ? {
          activeStationId: id,
          selected,
          routeOverview: false,
          flight: null,
          mode: 'ROVER',
        }
      : {
          activeStationId: id,
          selected,
          surfaceView: false,
          routeOverview: false,
          flight: {
            destination: position.clone(),
            requestedAt: performance.now(),
            quick: false,
            desiredAltitude: 3,
            enterSurface: true,
          },
        });
  },
}));
