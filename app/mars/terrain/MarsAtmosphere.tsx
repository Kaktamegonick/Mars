'use client';

import * as THREE from 'three';
import { MARS_RADIUS } from '../utils/coordinates';

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec3 viewDirection = normalize(-vViewPosition);
    float rim = pow(1.0 - max(dot(vNormal, viewDirection), 0.0), 3.2);
    float haze = pow(1.0 - max(dot(vNormal, viewDirection), 0.0), 7.0);
    vec3 color = mix(vec3(0.55, 0.12, 0.035), vec3(1.0, 0.42, 0.16), haze);
    gl_FragColor = vec4(color, rim * 0.46);
  }
`;

export function MarsAtmosphere() {
  return (
    <mesh scale={1.028}>
      <sphereGeometry args={[MARS_RADIUS, 128, 96]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
