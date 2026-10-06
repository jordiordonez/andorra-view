import type { FeedResponse } from '../../src/core/types'
import { METEO_STATIONS } from '../../src/data/meteoStations'
import { METEO_TABS, meteoTabUrl, normalizeMeteoAd, type MeteoVariable, type RawMeteoRow } from '../../src/providers/meteoAd'
import { fetchJson, UpstreamError } from '../http'
import type { JsonFeed } from './types'

/** Current observations of the SMN (meteo.ad) automatic stations. */
export const weatherStationsFeed: JsonFeed = {
  kind: 'json',
  id: 'weather-stations',
  sourceId: 'meteo-ad',
  ttlSeconds: 300,
  staleSeconds: 3 * 3600,
  async load({ env }): Promise<FeedResponse> {
    const fetchedAt = new Date().toISOString()
    const variables = Object.keys(METEO_TABS) as MeteoVariable[]
    const results = await Promise.allSettled(
      variables.map((v) => fetchJson<RawMeteoRow[]>(env, meteoTabUrl(METEO_TABS[v]), { timeoutMs: 8000, retries: 0 })),
    )
    const tabs: Partial<Record<MeteoVariable, RawMeteoRow[]>> = {}
    const failed: string[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) tabs[variables[i]] = r.value
      else failed.push(variables[i])
    })
    if (!tabs.temperature && failed.length === variables.length) throw new UpstreamError('meteo.ad: all observation requests failed')
    const { entities, unlocated, staleDropped, newest } = normalizeMeteoAd(tabs, METEO_STATIONS)
    const warnings = [
      failed.length ? `Variables no disponibles: ${failed.join(', ')}` : '',
      staleDropped.length ? `${staleDropped.length} estacions sense observacions de les últimes 3 h` : '',
    ].filter(Boolean)
    return {
      source: 'meteo-ad',
      fetchedAt,
      sourceUpdatedAt: newest,
      entities,
      warning: warnings.length ? warnings.join(' · ') : undefined,
      meta: { unlocated, staleDropped, failedVariables: failed },
    }
  },
}
