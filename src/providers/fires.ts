import { ANDORRA_CENTER, haversineKm, type LonLat } from '../config/geo'
import type { GeoEntity } from '../core/types'

export interface FireProps extends Record<string, unknown> {
  /** Acquisition time (UTC ISO) of the satellite overpass. */
  acquiredAt: string
  satellite: string
  instrument: 'VIIRS' | 'MODIS' | string
  /** VIIRS: low | nominal | high. MODIS: 0–100 (%). */
  confidence: string
  /** Fire radiative power, MW. */
  frpMw?: number
  /** Brightness temperature (K) of the main channel. */
  brightnessK?: number
  dayNight: 'day' | 'night' | 'unknown'
  distanceKm: number
}

const SATELLITES: Record<string, string> = {
  N: 'Suomi NPP',
  N20: 'NOAA-20',
  '1': 'NOAA-20',
  N21: 'NOAA-21',
  '2': 'NOAA-21',
  A: 'Aqua',
  T: 'Terra',
  Aqua: 'Aqua',
  Terra: 'Terra',
}

/** Minimal CSV parser for FIRMS files (no quoted fields in FIRMS output). */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const header = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(',')
    return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()]))
  })
}

function acquisitionIso(date: string, hhmm: string): string | undefined {
  const t = hhmm.padStart(4, '0')
  const iso = `${date}T${t.slice(0, 2)}:${t.slice(2, 4)}:00Z`
  return Number.isNaN(Date.parse(iso)) ? undefined : new Date(iso).toISOString()
}

/** Normalize FIRMS CSV rows (VIIRS or MODIS, file or area API) to fire entities within `radiusKm`. */
export function normalizeFirms(rows: Record<string, string>[], radiusKm: number, center: LonLat = ANDORRA_CENTER, source = 'nasa-firms'): GeoEntity<FireProps>[] {
  const out: GeoEntity<FireProps>[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    const latitude = Number(r.latitude)
    const longitude = Number(r.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
    const distanceKm = haversineKm(center, { latitude, longitude })
    if (distanceKm > radiusKm) continue
    const acquiredAt = acquisitionIso(r.acq_date, r.acq_time)
    if (!acquiredAt) continue
    const isModis = 'brightness' in r && !('bright_ti4' in r)
    const sat = SATELLITES[r.satellite] ?? r.satellite
    const id = `${source}:${r.satellite}:${latitude.toFixed(4)}:${longitude.toFixed(4)}:${r.acq_date}${r.acq_time}`
    if (seen.has(id)) continue
    seen.add(id)
    const frp = Number(r.frp)
    const bright = Number(isModis ? r.brightness : r.bright_ti4)
    out.push({
      id,
      type: 'fire',
      label: `Punt calent ${sat}`,
      position: { latitude, longitude },
      timestamp: acquiredAt,
      source,
      properties: {
        acquiredAt,
        satellite: sat,
        instrument: isModis ? 'MODIS' : 'VIIRS',
        confidence: r.confidence,
        frpMw: Number.isFinite(frp) ? frp : undefined,
        brightnessK: Number.isFinite(bright) ? bright : undefined,
        dayNight: r.daynight === 'D' ? 'day' : r.daynight === 'N' ? 'night' : 'unknown',
        distanceKm: Math.round(distanceKm * 10) / 10,
      },
    })
  }
  return out.sort((a, b) => b.properties.acquiredAt.localeCompare(a.properties.acquiredAt))
}
