import type { GeoEntity } from '../core/types'
import { decodeEntities, stripHtml, tzOffsetMinutes } from './mobilitat'

/**
 * Govern d'Andorra air quality network (aire.ad internal API, undocumented):
 *   GET  https://aire.ad/api/web/mapData        (header lang: ca-ES) → index per station shown on the map
 *   POST https://aire.ad/api/web/stations       (header lang: ca-ES) → station metadata with lat/long
 *   POST https://aire.ad/api/web/latestData     (headers lang, stationID) → latest pollutant values
 */

export const AIRE_BASE = 'https://aire.ad/api/web'

export interface RawAireMap {
  stationID: string
  date?: string
  aqi?: number
  aqiBand?: string
  aqiColor?: string
  webName?: string
}

export interface RawAireStation {
  stationId: string
  name?: string
  type?: string
  parroquia?: string
  ubicacio?: string
  lat?: number
  long?: number
  altitude?: string | number
}

export interface RawAireLatest {
  date?: string
  pollutant?: string
  concentration?: string
  index?: string
  band?: string
  color?: string
  period?: string
}

export interface Pollutant {
  name: string
  concentration: string
  value?: number
  unit?: string
  band?: string
  color?: string
  period?: string
}

export interface AirQualityProps extends Record<string, unknown> {
  stationId: string
  /** Index value as published (lower = better). */
  index?: number
  band?: string
  /** Colour published by the source for the band. */
  color?: string
  stationType?: string
  parish?: string
  location?: string
  altitudeM?: number
  pollutants: Pollutant[]
}

const clean = (s: unknown) => (typeof s === 'string' ? decodeEntities(s).replace(/ /g, ' ').trim() || undefined : undefined)
const hex = (s: unknown) => (typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s) ? s : undefined)

/** "Dimarts 06/10/2026 a les 10h" (local time) → ISO. */
export function parseAireMapDate(s: unknown): string | undefined {
  if (typeof s !== 'string') return undefined
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})\D+(\d{1,2})h/)
  if (!m) return undefined
  const local = Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4])
  return new Date(local - tzOffsetMinutes(local, 'Europe/Andorra') * 60_000).toISOString()
}

/** "10/6/2026 10:00:00 AM" (US M/D/YYYY, local time) → ISO. */
export function parseAireLatestDate(s: unknown): string | undefined {
  if (typeof s !== 'string') return undefined
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i)
  if (!m) return undefined
  let h = +m[4]
  const ampm = m[7]?.toUpperCase()
  if (ampm === 'AM' && h === 12) h = 0
  if (ampm === 'PM' && h < 12) h += 12
  const local = Date.UTC(+m[3], +m[1] - 1, +m[2], h, +m[5], +(m[6] ?? 0))
  return new Date(local - tzOffsetMinutes(local, 'Europe/Andorra') * 60_000).toISOString()
}

export function parsePollutant(r: RawAireLatest): Pollutant | undefined {
  const name = stripHtml(r.pollutant)
  if (!name) return undefined
  const conc = stripHtml(r.concentration).replace(/m3\b/, 'm³')
  const m = conc.match(/^(-?\d+(?:[.,]\d+)?)\s*(.*)$/)
  return {
    name,
    concentration: conc,
    value: m ? Number(m[1].replace(',', '.')) : undefined,
    unit: m?.[2] || undefined,
    band: clean(r.band),
    color: hex(r.color),
    period: clean(stripHtml(r.period)),
  }
}

export function normalizeAire(
  map: RawAireMap[],
  stations: RawAireStation[],
  latest: Record<string, RawAireLatest[]>,
  source = 'aire-ad',
): GeoEntity<AirQualityProps>[] {
  const meta = new Map(stations.map((s) => [s.stationId, s]))
  const out: GeoEntity<AirQualityProps>[] = []
  for (const m of map) {
    const s = meta.get(m.stationID)
    if (!s || typeof s.lat !== 'number' || typeof s.long !== 'number') continue
    const rows = latest[m.stationID] ?? []
    const pollutants = rows.map(parsePollutant).filter((p): p is Pollutant => !!p)
    const timestamp = parseAireMapDate(m.date) ?? parseAireLatestDate(rows[0]?.date)
    const alt = typeof s.altitude === 'number' ? s.altitude : Number(String(s.altitude ?? '').replace(/[^\d.]/g, ''))
    out.push({
      id: `${source}:${m.stationID}`,
      type: 'airQuality',
      label: clean(m.webName) ?? clean(s.name) ?? m.stationID,
      position: { latitude: s.lat, longitude: s.long },
      timestamp,
      source,
      properties: {
        stationId: m.stationID,
        index: typeof m.aqi === 'number' ? Math.round(m.aqi * 100) / 100 : undefined,
        band: clean(m.aqiBand),
        color: hex(m.aqiColor),
        stationType: clean(s.type),
        parish: clean(s.parroquia),
        location: clean(s.ubicacio),
        altitudeM: Number.isFinite(alt) && alt > 0 ? alt : undefined,
        pollutants,
      },
    })
  }
  return out
}
