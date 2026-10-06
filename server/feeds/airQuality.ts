import type { FeedResponse } from '../../src/core/types'
import { AIRE_BASE, normalizeAire, type RawAireLatest, type RawAireMap, type RawAireStation } from '../../src/providers/aireAd'
import { fetchJson, UpstreamError } from '../http'
import type { JsonFeed } from './types'

const MAX_LATEST_CALLS = 6

/** Air quality index + latest pollutant values (Govern d'Andorra, aire.ad). ≤ 8 upstream calls per refresh. */
export const airQualityFeed: JsonFeed = {
  kind: 'json',
  id: 'air-quality',
  sourceId: 'aire-ad',
  ttlSeconds: 1800,
  staleSeconds: 6 * 3600,
  async load({ env }): Promise<FeedResponse> {
    const fetchedAt = new Date().toISOString()
    const headers = { lang: 'ca-ES' }
    const [map, stations] = await Promise.all([
      fetchJson<RawAireMap[]>(env, `${AIRE_BASE}/mapData`, { timeoutMs: 8000, headers }),
      fetchJson<RawAireStation[]>(env, `${AIRE_BASE}/stations`, { method: 'POST', body: '', timeoutMs: 8000, headers }),
    ])
    if (!Array.isArray(map) || !Array.isArray(stations)) throw new UpstreamError('aire.ad: unexpected response')
    const ids = map.map((m) => m.stationID).filter((id) => typeof id === 'string' && /^[A-Z0-9]{4,12}$/.test(id)).slice(0, MAX_LATEST_CALLS)
    const latestResults = await Promise.allSettled(
      ids.map((id) =>
        fetchJson<RawAireLatest[]>(env, `${AIRE_BASE}/latestData`, { method: 'POST', body: '', timeoutMs: 8000, retries: 0, headers: { ...headers, stationID: id } }),
      ),
    )
    const latest: Record<string, RawAireLatest[]> = {}
    latestResults.forEach((r, i) => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) latest[ids[i]] = r.value
    })
    const entities = normalizeAire(map, stations, latest)
    const newest = entities.map((e) => e.timestamp).filter(Boolean).sort().at(-1)
    const missing = ids.length - Object.keys(latest).length
    return {
      source: 'aire-ad',
      fetchedAt,
      sourceUpdatedAt: newest,
      entities,
      warning: missing ? `Valors per contaminant no disponibles per a ${missing} estacions` : undefined,
    }
  },
}
