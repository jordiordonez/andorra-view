/**
 * Central geographic configuration. Every coordinate the app needs for Andorra lives here —
 * providers, layers and UI must import from this module rather than hard-coding numbers.
 */

export interface BBox {
  west: number
  south: number
  east: number
  north: number
}

export interface LonLat {
  longitude: number
  latitude: number
}

/** Tight bounding box of the Principality (derived from the Govern d'Andorra parish polygons). */
export const ANDORRA_BBOX: BBox = { west: 1.4135, south: 42.4288, east: 1.7866, north: 42.6559 }

export const ANDORRA_CENTER: LonLat = { longitude: 1.5967, latitude: 42.5424 }

/** Buffers (in degrees) used when a provider supports bbox queries. */
export const BUFFERS = {
  /** Airspace around Andorra: roughly Toulouse–Barcelona corridor approaches. */
  airspace: 0.65,
  /** Natural events (fires, earthquakes) worth showing for context. */
  regional: 1.2,
} as const

/** Radii (km) for providers that take a point + radius. */
export const RADII_KM = {
  airspace: 110,
  earthquakes: 150,
  fires: 150,
} as const

export function expandBBox(b: BBox, deg: number): BBox {
  return { west: b.west - deg, south: b.south - deg, east: b.east + deg, north: b.north + deg }
}

export const AIRSPACE_BBOX = expandBBox(ANDORRA_BBOX, BUFFERS.airspace)
export const REGIONAL_BBOX = expandBBox(ANDORRA_BBOX, BUFFERS.regional)

export function inBBox(lon: number, lat: number, b: BBox): boolean {
  return lon >= b.west && lon <= b.east && lat >= b.south && lat <= b.north
}

const EARTH_RADIUS_KM = 6371.0088

/** Great-circle distance in km. */
export function haversineKm(a: LonLat, b: LonLat): number {
  const toRad = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * toRad
  const dLon = (b.longitude - a.longitude) * toRad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * toRad) * Math.cos(b.latitude * toRad) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function distanceFromAndorraKm(p: LonLat): number {
  return haversineKm(ANDORRA_CENTER, p)
}

export interface CameraPreset {
  id: string
  name: string
  /** Point the camera looks at. */
  target: LonLat
  /** Distance from target in metres. */
  range: number
  /** Degrees, 0 = north. */
  heading: number
  /** Degrees, negative looks down. */
  pitch: number
  group: 'place' | 'theme'
  /** Layers switched on by thematic presets. */
  layers?: string[]
}

// Town targets are OSM `place` node coordinates; the Spanish border target is the OSM customs post
// (see public/data/places.geojson and poi.geojson produced by scripts/fetch-static.mjs).
export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'andorra', name: 'Andorra', target: ANDORRA_CENTER, range: 42000, heading: 20, pitch: -38, group: 'place' },
  { id: 'andorra-la-vella', name: 'Andorra la Vella', target: { longitude: 1.52125, latitude: 42.50694 }, range: 4200, heading: 40, pitch: -32, group: 'place' },
  { id: 'escaldes', name: 'Escaldes-Engordany', target: { longitude: 1.54041, latitude: 42.509 }, range: 4200, heading: 70, pitch: -32, group: 'place' },
  { id: 'encamp', name: 'Encamp', target: { longitude: 1.58361, latitude: 42.53604 }, range: 4500, heading: 30, pitch: -32, group: 'place' },
  { id: 'canillo', name: 'Canillo', target: { longitude: 1.59776, latitude: 42.56683 }, range: 4500, heading: 10, pitch: -32, group: 'place' },
  { id: 'pas-de-la-casa', name: 'Pas de la Casa', target: { longitude: 1.7333, latitude: 42.5423 }, range: 4500, heading: 300, pitch: -32, group: 'place' },
  { id: 'la-massana', name: 'La Massana', target: { longitude: 1.51638, latitude: 42.5442 }, range: 4500, heading: 340, pitch: -32, group: 'place' },
  { id: 'ordino', name: 'Ordino', target: { longitude: 1.53349, latitude: 42.55615 }, range: 4500, heading: 0, pitch: -32, group: 'place' },
  { id: 'sant-julia', name: 'Sant Julià de Lòria', target: { longitude: 1.49233, latitude: 42.46685 }, range: 4500, heading: 20, pitch: -32, group: 'place' },
  { id: 'border-es', name: 'Frontera Riu Runer (ES)', target: { longitude: 1.47288, latitude: 42.43533 }, range: 3500, heading: 20, pitch: -30, group: 'place' },
  { id: 'border-fr', name: 'Frontera Pas de la Casa (FR)', target: { longitude: 1.7347, latitude: 42.5463 }, range: 3500, heading: 250, pitch: -30, group: 'place' },
  { id: 'mobility', name: 'Mobilitat', target: { longitude: 1.553, latitude: 42.522 }, range: 16000, heading: 30, pitch: -45, group: 'theme', layers: ['traffic-incidents', 'webcams', 'parking'] },
  { id: 'weather', name: 'Meteo', target: ANDORRA_CENTER, range: 48000, heading: 0, pitch: -50, group: 'theme', layers: ['weather-stations', 'weather-alerts'] },
  { id: 'snow', name: 'Neu', target: { longitude: 1.62, latitude: 42.57 }, range: 38000, heading: 10, pitch: -40, group: 'theme', layers: ['avalanche', 'weather-stations', 'webcams'] },
  { id: 'emergency', name: 'Emergències', target: ANDORRA_CENTER, range: 320000, heading: 0, pitch: -70, group: 'theme', layers: ['fires', 'earthquakes', 'weather-alerts'] },
]
