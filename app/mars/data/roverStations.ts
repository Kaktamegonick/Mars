import * as THREE from 'three';
import { MARS_RADIUS } from '../utils/coordinates';

export type RoverStationId =
  | 'prop-m'
  | 'sojourner'
  | 'spirit'
  | 'opportunity'
  | 'curiosity'
  | 'perseverance-landing'
  | 'belva'
  | 'airey'
  | 'zhurong';

export type RoverStation = {
  id: RoverStationId;
  rover: string;
  mission: string;
  operator: string;
  year: string;
  name: string;
  region: string;
  sol: string;
  date: string;
  latitude: number;
  longitude: number;
  image: string | null;
  imageCount: number | null;
  imageAspect: number;
  viewType: 'panorama' | 'photo' | 'none';
  instrument: string;
  colorMode: string;
  status: 'SUCCESS' | 'ACTIVE' | 'NOT DEPLOYED';
  sourceLabel: 'NASA' | 'CNSA';
  sourceUrl: string;
  credit: string;
  note?: string;
};

export const ROVER_STATIONS: RoverStation[] = [
  {
    id: 'prop-m', rover: 'PrOP-M', mission: 'Mars 3', operator: 'USSR', year: '1971',
    name: 'Mars 3 predicted landing site', region: 'Ptolemaeus Crater · predicted ellipse',
    sol: 'NO SURFACE OPERATIONS', date: '02 DEC 1971', latitude: -45, longitude: -158,
    image: null, imageCount: null, imageAspect: 1, viewType: 'none', instrument: 'NO IMAGE RETURN',
    colorMode: 'NO DATA', status: 'NOT DEPLOYED', sourceLabel: 'NASA',
    sourceUrl: 'https://science.nasa.gov/resource/could-this-be-the-mars-soviet-3-lander/',
    credit: 'SOVIET MARS 3 / HISTORICAL RECORD',
    note: 'The lander transmitted for only 14.5 seconds. PrOP-M was never deployed, so no rover-camera image exists.',
  },
  {
    id: 'sojourner', rover: 'Sojourner', mission: 'Mars Pathfinder', operator: 'USA / NASA', year: '1997',
    name: 'Sagan Memorial Station', region: 'Ares Vallis · landing site', sol: 'SOL 25', date: '29 JUL 1997',
    latitude: 19.13, longitude: -33.22, image: '/mars-data/sojourner-sol25.jpg', imageCount: 1,
    imageAspect: 588 / 141, viewType: 'photo', instrument: 'FORWARD ROVER CAMERA', colorMode: 'COLOR',
    status: 'SUCCESS', sourceLabel: 'NASA', sourceUrl: 'https://science.nasa.gov/photojournal/looking-westward-at-the-lander/',
    credit: 'NASA / JPL / UNIVERSITY OF ARIZONA',
  },
  {
    id: 'spirit', rover: 'Spirit', mission: 'Mars Exploration Rover A', operator: 'USA / NASA', year: '2004',
    name: 'Columbia Memorial Station', region: 'Gusev Crater · landing site', sol: 'SOL 1', date: '04 JAN 2004',
    latitude: -14.5684, longitude: 175.4726, image: '/mars-data/spirit-landing.jpg', imageCount: 1,
    imageAspect: 1892 / 383, viewType: 'photo', instrument: 'LEFT NAVIGATION CAMERA', colorMode: 'MONOCHROME',
    status: 'SUCCESS', sourceLabel: 'NASA', sourceUrl: 'https://science.nasa.gov/photojournal/left-panorama-of-spirits-landing-site/',
    credit: 'NASA / JPL / CORNELL',
  },
  {
    id: 'opportunity', rover: 'Opportunity', mission: 'Mars Exploration Rover B', operator: 'USA / NASA', year: '2004',
    name: 'Eagle Crater', region: 'Meridiani Planum · landing area', sol: 'SOLS 58–60', date: '23–25 MAR 2004',
    latitude: -1.9462, longitude: -5.5266, image: '/mars-data/opportunity-lion-king.jpg', imageCount: 558,
    imageAspect: 4000 / 3000, viewType: 'photo', instrument: 'PANORAMIC CAMERA', colorMode: 'APPROX. TRUE COLOR',
    status: 'SUCCESS', sourceLabel: 'NASA', sourceUrl: 'https://science.nasa.gov/resource/lion-king-panorama/',
    credit: 'NASA / JPL-CALTECH / CORNELL',
  },
  {
    id: 'curiosity', rover: 'Curiosity', mission: 'Mars Science Laboratory', operator: 'USA / NASA', year: '2012',
    name: 'Bradbury Landing', region: 'Gale Crater · landing site', sol: 'SOL 2', date: '08 AUG 2012',
    latitude: -4.5895, longitude: 137.4417, image: '/mars-data/curiosity-landing-360.jpg', imageCount: null,
    imageAspect: 2000 / 255, viewType: 'panorama', instrument: 'NAVIGATION CAMERAS', colorMode: 'COLOR',
    status: 'ACTIVE', sourceLabel: 'NASA', sourceUrl: 'https://science.nasa.gov/resource/curiosity-takes-it-all-in/',
    credit: 'NASA / JPL-CALTECH',
  },
  {
    id: 'perseverance-landing', rover: 'Perseverance', mission: 'Mars 2020', operator: 'USA / NASA', year: '2021',
    name: 'Octavia E. Butler Landing', region: 'Jezero Crater floor', sol: 'SOL 3', date: '21 FEB 2021',
    latitude: 18.444543, longitude: 77.450947, image: '/mars-data/perseverance-landing-sol3.jpg', imageCount: 142,
    imageAspect: 6000 / 1589, viewType: 'panorama', instrument: 'MASTCAM-Z', colorMode: 'NATURAL COLOR',
    status: 'ACTIVE', sourceLabel: 'NASA', sourceUrl: 'https://science.nasa.gov/photojournal/mastcam-zs-first-360-degree-panorama/',
    credit: 'NASA / JPL-CALTECH / MSSS / ASU',
  },
  {
    id: 'zhurong', rover: 'Zhurong', mission: 'Tianwen-1', operator: 'CHINA / CNSA', year: '2021',
    name: 'Tianwen-1 Landing Site', region: 'Southern Utopia Planitia', sol: 'PRE-DEPLOYMENT', date: 'MAY 2021',
    latitude: 25.066, longitude: 109.925, image: '/mars-data/zhurong-landing-360.jpg', imageCount: null,
    imageAspect: 6000 / 2045, viewType: 'panorama', instrument: 'NAVIGATION & TERRAIN CAMERA', colorMode: 'COLOR',
    status: 'SUCCESS', sourceLabel: 'CNSA', sourceUrl: 'https://www.cnsa.gov.cn/n6758824/n6759009/n6760412/n6760413/c6840380/content.html',
    credit: 'CHINA NATIONAL SPACE ADMINISTRATION',
  },
  {
    id: 'belva', rover: 'Perseverance', mission: 'Mars 2020', operator: 'USA / NASA', year: '2023',
    name: 'Belva Crater', region: 'Echo Creek · west rim', sol: 'SOL 772', date: '22 APR 2023',
    latitude: 18.482929, longitude: 77.369008, image: '/mars-data/perseverance-belva-sol772.jpg', imageCount: 152,
    imageAspect: 6000 / 792, viewType: 'panorama', instrument: 'MASTCAM-Z', colorMode: 'NATURAL COLOR',
    status: 'ACTIVE', sourceLabel: 'NASA', sourceUrl: 'https://science.nasa.gov/photojournal/perseverance-takes-in-view-at-belva-crater/',
    credit: 'NASA / JPL-CALTECH / ASU / MSSS',
  },
  {
    id: 'airey', rover: 'Perseverance', mission: 'Mars 2020', operator: 'USA / NASA', year: '2023',
    name: 'Airey Hill', region: 'Jezero Crater · Margin Unit', sol: 'SOLS 962–965', date: '03–06 NOV 2023',
    latitude: 18.49651, longitude: 77.352337, image: '/mars-data/perseverance-airey-hill.jpg', imageCount: 993,
    imageAspect: 6000 / 1617, viewType: 'panorama', instrument: 'MASTCAM-Z', colorMode: 'NATURAL COLOR',
    status: 'ACTIVE', sourceLabel: 'NASA', sourceUrl: 'https://science.nasa.gov/photojournal/perseverances-360-degree-view-from-airey-hill/',
    credit: 'NASA / JPL-CALTECH / ASU / MSSS',
  },
];

export function getRoverStation(id: RoverStationId) {
  return ROVER_STATIONS.find((station) => station.id === id)
    ?? ROVER_STATIONS.find((station) => station.id === 'airey')
    ?? ROVER_STATIONS[0];
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
