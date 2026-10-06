import { RADII_KM, REGIONAL_BBOX } from '../../src/config/geo'
import type { FeedResponse } from '../../src/core/types'
import { normalizeFirms, parseCsv } from '../../src/providers/fires'
import { fetchText } from '../http'
import type { JsonFeed } from './types'

const BASE = 'https://firms.modaps.eosdis.nasa.gov'

/** Keyless 24 h Europe files, one per VIIRS satellite (verified 2026-10-06). */
const EUROPE_FILES = [
  'suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Europe_24h.csv',
  'noaa-20-viirs-c2/csv/J1_VIIRS_C2_Europe_24h.csv',
  'noaa-21-viirs-c2/csv/J2_VIIRS_C2_Europe_24h.csv',
]

/** Area API products when a MAP_KEY is configured (smaller downloads, bbox-filtered upstream). */
const AREA_PRODUCTS = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT']

export const firesFeed: JsonFeed = {
  kind: 'json',
  id: 'fires',
  sourceId: 'nasa-firms',
  ttlSeconds: 15 * 60,
  staleSeconds: 6 * 3600,
  async load({ env }): Promise<FeedResponse> {
    const fetchedAt = new Date().toISOString()
    const b = REGIONAL_BBOX
    const urls = env.FIRMS_MAP_KEY
      ? AREA_PRODUCTS.map((p) => `${BASE}/api/area/csv/${env.FIRMS_MAP_KEY}/${p}/${b.west},${b.south},${b.east},${b.north}/1`)
      : EUROPE_FILES.map((f) => `${BASE}/data/active_fire/${f}`)
    const errors: string[] = []
    const rows: Record<string, string>[] = []
    await Promise.all(
      urls.map(async (url) => {
        try {
          rows.push(...parseCsv(await fetchText(env, url, { timeoutMs: 20_000, retries: 1 })))
        } catch (err) {
          // Never leak the MAP_KEY in messages.
          errors.push((err instanceof Error ? err.message : String(err)).replaceAll(env.FIRMS_MAP_KEY ?? '\u0000', '***'))
        }
      }),
    )
    if (errors.length === urls.length) throw new Error(`FIRMS unavailable: ${errors[0]}`)
    const entities = normalizeFirms(rows, RADII_KM.fires)
    return {
      source: 'nasa-firms',
      fetchedAt,
      sourceUpdatedAt: entities[0]?.properties.acquiredAt,
      entities,
      warning: errors.length ? `Algun satèl·lit no disponible (${errors.length}/${urls.length})` : undefined,
    }
  },
}
