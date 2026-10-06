import type { FeedResponse } from '../../src/core/types'
import { FEDA_BASE, FEDA_SERIES, summarizeEnergy, type RawFedaValue } from '../../src/providers/feda'
import { fetchJson, UpstreamError } from '../http'
import type { JsonFeed } from './types'

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** National daily energy balance (FEDA). No map entities: the summary is in `meta.energy` (EnergySummary). */
export const energyFeed: JsonFeed = {
  kind: 'json',
  id: 'energy',
  sourceId: 'feda',
  ttlSeconds: 1800,
  staleSeconds: 2 * 24 * 3600,
  async load({ env }): Promise<FeedResponse> {
    const fetchedAt = new Date().toISOString()
    const to = isoDay(Date.now())
    const from = isoDay(Date.now() - 9 * 86_400_000)
    const hist = (id: number) =>
      fetchJson<RawFedaValue[]>(env, `${FEDA_BASE}/GetEnergyHistory?from=${from}&to=${to}&id=${id}&format=json`, { timeoutMs: 8000, retries: 0 })
    const [last, cons, prod] = await Promise.allSettled([
      fetchJson<RawFedaValue[]>(env, `${FEDA_BASE}/GetLastEnergy`, { timeoutMs: 8000 }),
      hist(FEDA_SERIES.consumption),
      hist(FEDA_SERIES.production),
    ])
    if (last.status === 'rejected' && cons.status === 'rejected') throw new UpstreamError('FEDA: energy endpoints unavailable')
    const summary = summarizeEnergy(
      last.status === 'fulfilled' ? last.value : [],
      cons.status === 'fulfilled' ? cons.value : undefined,
      prod.status === 'fulfilled' ? prod.value : undefined,
    )
    const sourceDay = summary.latest?.date ?? summary.lastComplete?.date
    return {
      source: 'feda',
      fetchedAt,
      sourceUpdatedAt: sourceDay ? `${sourceDay}T00:00:00.000Z` : undefined,
      entities: [],
      meta: { energy: summary },
      warning: last.status === 'rejected' || cons.status === 'rejected' || prod.status === 'rejected' ? 'Algunes sèries de FEDA no estan disponibles' : undefined,
    }
  },
}
