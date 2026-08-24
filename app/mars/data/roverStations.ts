import * as THREE from 'three';
import { MARS_RADIUS } from '../utils/coordinates';

export type RoverStation = {
  id: 'landing' | 'belva' | 'airey';
  name: string;
  region: string;
  sol: string;
  date: string;
  latitude: number;
  longitude: number;
  image: string;
  imageCount: number;
  imageAspect: number;
  colorMode: string;
  sourceUrl: string;
  credit: string;
};

export const ROVER_STATIONS: RoverStation[] = [
  {
    id: 'landing',
    name: 'Octavia E. Butler Landing',
    region: 'Jezero Crater floor',
    sol: 'SOL 3',
    date: '21 FEB 2021',
    latitude: 18.444543,
    longitude: 77.450947,
    image: '/mars-data/perseverance-landing-sol3.jpg',
    imageCount: 142,
    imageAspect: 9255 / 2451,
    colorMode: 'NATURAL COLOR',
    sourceUrl: 'https://science.nasa.gov/photojournal/mastcam-zs-first-360-degree-panorama/',
    credit: 'NASA / JPL-CALTECH / MSSS / ASU',
  },
  {
    id: 'belva',
    name: 'Belva Crater',
    region: 'Echo Creek · west rim',
    sol: 'SOL 772',
    date: '22 APR 2023',
    latitude: 18.482929,
    longitude: 77.369008,
    image: '/mars-data/perseverance-belva-sol772.jpg',
    imageCount: 152,
    imageAspect: 9021 / 1191,
    colorMode: 'NATURAL COLOR',
    sourceUrl: 'https://science.nasa.gov/photojournal/perseverance-takes-in-view-at-belva-crater/',
    credit: 'NASA / JPL-CALTECH / ASU / MSSS',
  },
  {
    id: 'airey',
    name: 'Airey Hill',
    region: 'Jezero Crater · Margin Unit',
    sol: 'SOLS 962–965',
    date: '03–06 NOV 2023',
    latitude: 18.496510,
    longitude: 77.352337,
    image: '/mars-data/perseverance-airey-hill.jpg',
    imageCount: 993,
    imageAspect: 9000 / 2425,
    colorMode: 'NATURAL COLOR',
    sourceUrl: 'https://science.nasa.gov/photojournal/perseverances-360-degree-view-from-airey-hill/',
    credit: 'NASA / JPL-CALTECH / ASU / MSSS',
  },
];

export function getRoverStation(id: RoverStation['id']) {
  return ROVER_STATIONS.find((station) => station.id === id) ?? ROVER_STATIONS[2];
}

export function stationPosition(station: RoverStation, radius = MARS_RADIUS + 0.035) {
  const latitude = THREE.MathUtils.degToRad(station.latitude);
  const theta = THREE.MathUtils.degToRad(station.longitude + 90);
  const horizontal = Math.cos(latitude) * radius;
  return new THREE.Vector3(
    Math.cos(theta) * horizontal,
    Math.sin(latitude) * radius,
    Math.sin(theta) * horizontal,
  );
}
