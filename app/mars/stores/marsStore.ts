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
};

type MarsState = {
  surfaceView: boolean;
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
  activeStationId: 'airey',
  setHover: (hover) => set({ hover }),
  select: (selected, quick = false) => set({ selected, flight: { destination: selected.position.clone(), requestedAt: performance.now(), quick } }),
  rejectTerrainVisit: () => set({ terrainNotice: performance.now() }),
  orbitOut: () => set((state) => ({
    flight: {
      destination: state.cameraPoint.position.clone(),
      requestedAt: performance.now(),
      quick: false,
      desiredAltitude: 1_800_000,
    },
  })),
  setTelemetry: (payload) => set(payload),
  clearFlight: () => set({ flight: null }),
  enterSurfaceView: () => set({ surfaceView: true, flight: null, mode: 'ROVER' }),
  exitSurfaceView: () => set({ surfaceView: false, mode: 'ORBITAL', altitude: 1_800_000 }),
  visitStation: (id) => {
    const station = getRoverStation(id);
    const position = stationPosition(station);
    const selected = { position, latitude: station.latitude, longitude: station.longitude, elevation: 0 };
    set({
      activeStationId: id,
      selected,
      surfaceView: false,
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
