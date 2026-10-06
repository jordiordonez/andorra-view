import type { BBox } from '../config/geo'
import { inBBox } from '../config/geo'
import type { GeoEntity } from '../core/types'

/** Normalized aircraft properties. Registration is deliberately not kept (it can identify private owners). */
export interface AircraftProps extends Record<string, unknown> {
  icao24: string
  callsign?: string
  aircraftType?: string
  /** Barometric altitude in metres; undefined when on ground or unknown. */
  altitudeM?: number
  onGround: boolean
  /** Ground speed in km/h. */
  speedKmh?: number
  /** True track in degrees. */
  headingDeg?: number
  /** Vertical rate in m/s. */
  verticalRateMs?: number
  squawk?: string
  /** Seconds since the last position message, as reported by the source. */
  positionAgeS?: number
}

const FT = 0.3048
const KT_TO_KMH = 1.852
const FPM_TO_MS = 0.00508

const clean = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim() : undefined)

/** readsb / adsb.lol v2 response. */
export interface AdsbLolResponse {
  now: number
  ac?: Array<Record<string, unknown>>
}

export function normalizeAdsbLol(raw: AdsbLolResponse, bbox: BBox, source = 'adsb-lol'): GeoEntity<AircraftProps>[] {
  const nowMs = typeof raw.now === 'number' ? raw.now : Date.now()
  const out: GeoEntity<AircraftProps>[] = []
  for (const a of raw.ac ?? []) {
    const lat = a.lat as number | undefined
    const lon = a.lon as number | undefined
    const hex = clean(a.hex)
    if (typeof lat !== 'number' || typeof lon !== 'number' || !hex || hex.startsWith('~')) continue
    if (!inBBox(lon, lat, bbox)) continue
    const onGround = a.alt_baro === 'ground'
    const altFt = typeof a.alt_baro === 'number' ? a.alt_baro : typeof a.alt_geom === 'number' ? a.alt_geom : undefined
    const seenPos = typeof a.seen_pos === 'number' ? a.seen_pos : typeof a.seen === 'number' ? a.seen : 0
    const callsign = clean(a.flight)
    out.push({
      id: `${source}:${hex}`,
      type: 'aircraft',
      label: callsign ?? hex.toUpperCase(),
      position: { latitude: lat, longitude: lon, altitude: altFt !== undefined ? altFt * FT : undefined },
      timestamp: new Date(nowMs - seenPos * 1000).toISOString(),
      source,
      properties: {
        icao24: hex,
        callsign,
        aircraftType: clean(a.t),
        altitudeM: onGround || altFt === undefined ? undefined : Math.round(altFt * FT),
        onGround,
        speedKmh: typeof a.gs === 'number' ? Math.round(a.gs * KT_TO_KMH) : undefined,
        headingDeg: typeof a.track === 'number' ? a.track : typeof a.true_heading === 'number' ? a.true_heading : undefined,
        verticalRateMs:
          typeof a.baro_rate === 'number' ? +(a.baro_rate * FPM_TO_MS).toFixed(1) : typeof a.geom_rate === 'number' ? +(a.geom_rate * FPM_TO_MS).toFixed(1) : undefined,
        squawk: clean(a.squawk),
        positionAgeS: seenPos,
      },
    })
  }
  return out
}

/** OpenSky /states/all response: `states` are positional arrays (see OpenSky REST docs). */
export interface OpenSkyResponse {
  time: number
  states: Array<unknown[]> | null
}

export function normalizeOpenSky(raw: OpenSkyResponse, bbox: BBox, source = 'opensky'): GeoEntity<AircraftProps>[] {
  const out: GeoEntity<AircraftProps>[] = []
  for (const s of raw.states ?? []) {
    const [icao24, callsign, , timePosition, lastContact, lon, lat, baroAlt, onGround, velocity, track, vRate, , geoAlt, squawk] = s as [
      string, string | null, string, number | null, number, number | null, number | null, number | null, boolean, number | null, number | null, number | null, unknown, number | null, string | null,
    ]
    if (typeof lat !== 'number' || typeof lon !== 'number' || !icao24) continue
    if (!inBBox(lon, lat, bbox)) continue
    const alt = baroAlt ?? geoAlt ?? undefined
    const cs = clean(callsign)
    const t = timePosition ?? lastContact
    out.push({
      id: `${source}:${icao24}`,
      type: 'aircraft',
      label: cs ?? icao24.toUpperCase(),
      position: { latitude: lat, longitude: lon, altitude: alt ?? undefined },
      timestamp: new Date(t * 1000).toISOString(),
      source,
      properties: {
        icao24,
        callsign: cs,
        altitudeM: onGround || alt == null ? undefined : Math.round(alt),
        onGround: !!onGround,
        speedKmh: typeof velocity === 'number' ? Math.round(velocity * 3.6) : undefined,
        headingDeg: track ?? undefined,
        verticalRateMs: vRate ?? undefined,
        squawk: clean(squawk),
        positionAgeS: Math.max(0, raw.time - t),
      },
    })
  }
  return out
}
