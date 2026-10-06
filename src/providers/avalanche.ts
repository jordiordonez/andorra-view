import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { GeoEntity } from '../core/types'

/** Region names from https://regions.avalanches.org/micro-regions_names/ca.json (checked 2026-10-06). */
export const AD_REGION_NAMES: Record<string, string> = { 'AD-01': 'Zona Nord', 'AD-02': 'Àrea Central', 'AD-03': 'Zona Sud' }

/** EAWS danger scale (1–5), Catalan terms used by the SMN bulletin. */
export const DANGER_LEVELS: Record<number, { name: string; color: string }> = {
  1: { name: 'Feble', color: '#ccff66' },
  2: { name: 'Limitat', color: '#ffff00' },
  3: { name: 'Marcat', color: '#ff9900' },
  4: { name: 'Fort', color: '#ff0000' },
  5: { name: 'Molt fort', color: '#7f1d1d' },
}

export interface AvalancheProps extends Record<string, unknown> {
  regionId: string
  regionName: string
  /** Max danger rating of the day (1–5). */
  level: number
  levelName: string
  /** Optional breakdown when the bulletin differs by time of day / elevation band. */
  am?: number
  pm?: number
  high?: number
  low?: number
  date: string
}

export interface EawsRatings {
  maxDangerRatings: Record<string, number>
}

export function eawsRatingsUrl(date: string) {
  return `https://static.avalanche.report/eaws_bulletins/${date}/${date}.ratings.json`
}

/** Today's date (YYYY-MM-DD) in Europe/Andorra. */
export function andorraDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Andorra', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/**
 * Join EAWS max-danger ratings with the Andorran micro-region polygons. A rating of 0 (or a missing
 * key) means no bulletin was published for that region: such regions are dropped, never shown as "1".
 */
export function normalizeEaws(ratings: EawsRatings | undefined, regions: FeatureCollection<Polygon | MultiPolygon>, date: string, source = 'eaws'): GeoEntity<AvalancheProps>[] {
  const r = ratings?.maxDangerRatings ?? {}
  const out: GeoEntity<AvalancheProps>[] = []
  for (const f of regions.features) {
    const regionId = String(f.properties?.id ?? '')
    const level = r[regionId]
    if (!regionId.startsWith('AD-') || !level || level < 1 || level > 5) continue
    const pts = (f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat()).flat()
    const opt = (k: string) => (r[`${regionId}:${k}`] && r[`${regionId}:${k}`] > 0 ? r[`${regionId}:${k}`] : undefined)
    out.push({
      id: `${source}:${regionId}`,
      type: 'avalancheZone',
      label: `Perill d’allaus ${level} · ${AD_REGION_NAMES[regionId] ?? regionId}`,
      position: { longitude: pts.reduce((s, p) => s + p[0], 0) / pts.length, latitude: pts.reduce((s, p) => s + p[1], 0) / pts.length },
      geometry: f.geometry,
      timestamp: `${date}T00:00:00Z`,
      source,
      properties: {
        regionId,
        regionName: AD_REGION_NAMES[regionId] ?? regionId,
        level,
        levelName: DANGER_LEVELS[level].name,
        am: opt('am'),
        pm: opt('pm'),
        high: opt('high'),
        low: opt('low'),
        date,
      },
    })
  }
  return out
}
