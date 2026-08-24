import { create } from 'zustand';
import * as THREE from 'three';

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
};

type MarsState = {
  hover: MarsPoint | null;
  selected: MarsPoint | null;
  cameraPoint: MarsPoint;
  altitude: number;
  zoom: number;
  mode: string;
  fps: number;
  flight: Flight | null;
  setHover: (point: MarsPoint | null) => void;
  select: (point: MarsPoint, quick?: boolean) => void;
  orbitOut: () => void;
  setTelemetry: (payload: Partial<Pick<MarsState, 'cameraPoint' | 'altitude' | 'zoom' | 'mode' | 'fps'>>) => void;
  clearFlight: () => void;
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
  flight: null,
  setHover: (hover) => set({ hover }),
  select: (selected, quick = false) => set({ selected, flight: { destination: selected.position.clone(), requestedAt: performance.now(), quick } }),
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
}));
