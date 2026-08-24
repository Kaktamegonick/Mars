import * as THREE from 'three';
import { DISPLACEMENT_UNITS, MARS_RADIUS } from '../utils/coordinates';

export function createMarsGeometry(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('2D canvas is required for terrain decoding.');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const geometry = new THREE.SphereGeometry(MARS_RADIUS, 256, 128);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;

  for (let i = 0; i < position.count; i += 1) {
    const u = Math.min(canvas.width - 1, Math.max(0, Math.round(uv.getX(i) * (canvas.width - 1))));
    const v = Math.min(canvas.height - 1, Math.max(0, Math.round((1 - uv.getY(i)) * (canvas.height - 1))));
    const value = pixels[(v * canvas.width + u) * 4] / 255;
    const radius = MARS_RADIUS + (value - 0.5) * DISPLACEMENT_UNITS;
    const normal = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i)).normalize().multiplyScalar(radius);
    position.setXYZ(i, normal.x, normal.y, normal.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
