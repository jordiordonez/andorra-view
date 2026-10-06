import type { GeoEntity } from '../core/types'
import type { MeteoStationMeta } from '../data/meteoStations'

/**
 * Servei Meteorològic Nacional d'Andorra — current observations behind the meteo.ad home map:
 *   GET https://www.meteo.ad/home/DadesActuals?idioma=0&pestanya={tab}&privat=false
 * Each row: [code, htmlInfo "(1876m)<br>06/10/2026 … 09:54 (UTC)", name, css pixel pos, value "12.2ºC", chartUrl, "True"].
 * Pixel positions are for the site's map image — coordinates come from the station metadata.
 */

export const METEO_TABS = {
  temperature: 0,
  precip24h: 3,
  wind: 4,
  humidity: 6,
  snowDepth: 10,
  pressureMsl: 12,
} as const

export type MeteoVariable = keyof typeof METEO_TABS

export const meteoTabUrl = (tab: number) => `https://www.meteo.ad/home/DadesActuals?idioma=0&pestanya=${tab}&privat=false`

export type RawMeteoRow = [string, string, string, string, string, string?, string?]

export interface WeatherStationProps extends Record<string, unknown> {
  code: string
  altitudeM?: number
  temperatureC?: number
  precip24hMm?: number
  windDirDeg?: number
  windSpeedMs?: number
  humidityPct?: number
  snowDepthCm?: number
  pressureMslHPa?: number
  /** Observation time per variable (ISO), as reported. */
  observedAt: Partial<Record<MeteoVariable, string>>
}

/** "(1876m)<br>06/10/2026</span><br>09:54 (UTC)" → { altitude, iso } */
export function parseMeteoInfo(html: string): { altitudeM?: number; observedAt?: string } {
  const alt = html.match(/\((\d+)\s*m\)/)
  const date = html.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  const time = html.match(/(\d{1,2}):(\d{2})\s*\(UTC\)/)
  let observedAt: string | undefined
  if (date && time) {
    const [, d, m, y] = date
    const t = Date.UTC(+y, +m - 1, +d, +time[1], +time[2])
    if (Number.isFinite(t)) observedAt = new Date(t).toISOString()
  }
  return { altitudeM: alt ? Number(alt[1]) : undefined, observedAt }
}

const firstNumber = (s: string) => {
  const m = s.replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : undefined
}

/** Parse a value string for a given variable. Returns undefined for unparseable/missing. */
export function parseMeteoValue(variable: MeteoVariable, value: string): Partial<WeatherStationProps> {
  if (typeof value !== 'string' || !value.trim()) return {}
  switch (variable) {
    case 'temperature':
      return { temperatureC: firstNumber(value) }
    case 'precip24h':
      return { precip24hMm: firstNumber(value) }
    case 'humidity':
      return { humidityPct: firstNumber(value) }
    case 'snowDepth':
      return { snowDepthCm: firstNumber(value) }
    case 'pressureMsl':
      return { pressureMslHPa: firstNumber(value) }
    case 'wind': {
      // "197º | 0.5m/s"
      const m = value.replace(',', '.').match(/(-?\d+(?:\.\d+)?)\s*[º°]\s*\|\s*(\d+(?:\.\d+)?)\s*m\/s/)
      return m ? { windDirDeg: Number(m[1]), windSpeedMs: Number(m[2]) } : {}
    }
  }
}

export interface MeteoNormalizeResult {
  entities: GeoEntity<WeatherStationProps>[]
  /** Station codes present in the feed but missing coordinates. */
  unlocated: string[]
  /** Stations dropped because all observations were older than maxAgeMs. */
  staleDropped: string[]
  newest?: string
}

/**
 * Join the per-tab rows with station metadata.
 * @param tabs rows by variable (a failed tab can simply be absent)
 */
export function normalizeMeteoAd(
  tabs: Partial<Record<MeteoVariable, RawMeteoRow[]>>,
  stations: MeteoStationMeta[],
  opts: { now?: number; maxAgeMs?: number; source?: string } = {},
): MeteoNormalizeResult {
  const { now = Date.now(), maxAgeMs = 3 * 3600_000, source = 'meteo-ad' } = opts
  const meta = new Map(stations.map((s) => [s.code, s]))
  const byCode = new Map<string, { name: string; props: WeatherStationProps }>()
  for (const [variable, rows] of Object.entries(tabs) as Array<[MeteoVariable, RawMeteoRow[]]>) {
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      if (!Array.isArray(row) || typeof row[0] !== 'string') continue
      const [code, info, name, , value] = row
      const { altitudeM, observedAt } = parseMeteoInfo(String(info ?? ''))
      if (!observedAt || now - Date.parse(observedAt) > maxAgeMs) {
        if (!byCode.has(code)) byCode.set(code, { name: String(name ?? code), props: { code, observedAt: {} } })
        continue
      }
      const entry = byCode.get(code) ?? { name: String(name ?? code), props: { code, observedAt: {} } }
      const parsed = parseMeteoValue(variable, String(value ?? ''))
      if (Object.values(parsed).some((v) => v !== undefined)) {
        Object.assign(entry.props, parsed)
        entry.props.observedAt[variable] = observedAt
      }
      entry.props.altitudeM ??= altitudeM
      byCode.set(code, entry)
    }
  }
  const entities: GeoEntity<WeatherStationProps>[] = []
  const unlocated: string[] = []
  const staleDropped: string[] = []
  let newest: string | undefined
  for (const [code, { name, props }] of byCode) {
    const times = Object.values(props.observedAt).filter(Boolean) as string[]
    if (!times.length) {
      staleDropped.push(code)
      continue
    }
    const m = meta.get(code)
    if (!m) {
      unlocated.push(code)
      continue
    }
    const latest = times.sort().at(-1)!
    if (!newest || latest > newest) newest = latest
    entities.push({
      id: `${source}:${code}`,
      type: 'weatherStation',
      label: name.trim() || m.name,
      position: { latitude: m.lat, longitude: m.lon, altitude: props.altitudeM ?? m.altitude },
      timestamp: latest,
      source,
      properties: { ...props, altitudeM: props.altitudeM ?? m.altitude },
    })
  }
  return { entities, unlocated, staleDropped, newest }
}
