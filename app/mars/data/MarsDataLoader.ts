export type MarsDataLayer = {
  id: string;
  source: 'MOLA' | 'HRSC' | 'CTX' | 'HiRISE';
  minZoom: number;
  maxZoom: number;
  imagery: string;
  elevation: string;
  active: boolean;
};

/**
 * LOD-ready layer manifest. TerrainManager can later replace the global layer
 * with region tiles without changing camera, raycasting, or HUD contracts.
 */
export const MARS_LAYERS: MarsDataLayer[] = [
  { id: 'global-mgs', source: 'MOLA', minZoom: 1, maxZoom: 7, imagery: '/mars-data/mars-color.jpg', elevation: '/mars-data/mars-elevation.jpg', active: true },
  { id: 'jezero-hrsc', source: 'HRSC', minZoom: 6, maxZoom: 11, imagery: '/mars-data/jezero/hrsc-color.webp', elevation: '/mars-data/jezero/hrsc-height.png', active: false },
  { id: 'jezero-ctx', source: 'CTX', minZoom: 10, maxZoom: 14, imagery: '/mars-data/jezero/ctx-color.webp', elevation: '/mars-data/jezero/ctx-height.png', active: false },
  { id: 'jezero-hirise', source: 'HiRISE', minZoom: 13, maxZoom: 18, imagery: '/mars-data/jezero/hirise-color.webp', elevation: '/mars-data/jezero/hirise-height.png', active: false },
];
