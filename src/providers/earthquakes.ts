import { ANDORRA_CENTER, haversineKm, RADII_KM, type LonLat } from '../config/geo'
import type { GeoEntity } from '../core/types'

export interface EarthquakeProps extends Record<string, unknown> {
  unid: string
  magnitude?: number
  magnitudeType?: string
  depthKm?: number
  region?: string
  /** Agency that provided the solution (IGN, ReNaSS, EMSC…). */
  agency?: string
  eventType?: string
  time: string
  lastUpdate?: string
  distanceKm: number
  url: string
}

/** FDSN-event JSON as served by EMSC (`format=json`, GeoJSON FeatureCollection). */
export interface EmscResponse {
  type: 'FeatureCollection'
  features: Array<{
    id?: string
    geometry?: { coordinates: number[] }
    properties: {
      unid?: string
      time?: string
      lastupdate?: string
      lat?: number
      lon?: number
      depth?: number
      mag?: number
      magtype?: string
      flynn_region?: string
      auth?: string
      evtype?: string
    }
  }>
}

/** Build the EMSC query URL (radius in degrees, ~111 km per degree). */
export function emscQueryUrl(days = 30, center: LonLat = ANDORRA_CENTER, radiusKm: number = RADII_KM.earthquakes, now = new Date()): string {
  const start = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 19)
  const params = new URLSearchParams({
    format: 'json',
    lat: String(center.latitude),
    lon: String(center.longitude),
    maxradius: (radiusKm / 111.2).toFixed(2),
    starttime: start,
    orderby: 'time',
    limit: '500',
  })
  return `https://www.seismicportal.eu/fdsnws/event/1/query?${params}`
}

export function normalizeEmsc(raw: EmscResponse | undefined, radiusKm: number = RADII_KM.earthquakes, center: LonLat = ANDORRA_CENTER, source = 'emsc'): GeoEntity<EarthquakeProps>[] {
  const out: GeoEntity<EarthquakeProps>[] = []
  for (const f of raw?.features ?? []) {
    const p = f.properties ?? {}
    const lon = p.lon ?? f.geometry?.coordinates?.[0]
    const lat = p.lat ?? f.geometry?.coordinates?.[1]
    const unid = p.unid ?? f.id
    if (typeof lat !== 'number' || typeof lon !== 'number' || !unid || !p.time) continue
    const distanceKm = haversineKm(center, { latitude: lat, longitude: lon })
    if (distanceKm > radiusKm) continue
    const time = new Date(p.time).toISOString()
    const depthKm = typeof p.depth === 'number' ? Math.abs(p.depth) : undefined
    out.push({
      id: `${source}:${unid}`,
      type: 'earthquake',
      label: typeof p.mag === 'number' ? `M${p.mag.toFixed(1)} ${p.flynn_region ?? ''}`.trim() : `Sisme ${p.flynn_region ?? ''}`.trim(),
      position: { latitude: lat, longitude: lon, altitude: depthKm !== undefined ? -depthKm * 1000 : undefined },
      timestamp: time,
      source,
      properties: {
        unid,
        magnitude: p.mag,
        magnitudeType: p.magtype,
        depthKm,
        region: p.flynn_region,
        agency: p.auth,
        eventType: p.evtype,
        time,
        lastUpdate: p.lastupdate ? new Date(p.lastupdate).toISOString() : undefined,
        distanceKm: Math.round(distanceKm),
        url: `https://www.seismicportal.eu/eventdetails.html?unid=${encodeURIComponent(unid)}`,
      },
    })
  }
  return out.sort((a, b) => b.properties.time.localeCompare(a.properties.time))
}
