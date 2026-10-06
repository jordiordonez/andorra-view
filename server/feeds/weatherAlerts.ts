import type { FeedResponse } from '../../src/core/types'
import { normalizeMeteoalarm, type MeteoalarmResponse } from '../../src/providers/weatherAlerts'
import { fetchJson } from '../http'
import type { JsonFeed } from './types'

export const weatherAlertsFeed: JsonFeed = {
  kind: 'json',
  id: 'weather-alerts',
  sourceId: 'meteoalarm',
  ttlSeconds: 5 * 60,
  staleSeconds: 2 * 3600,
  async load({ env }): Promise<FeedResponse> {
    const now = new Date()
    const raw = await fetchJson<MeteoalarmResponse>(env, 'https://feeds.meteoalarm.org/api/v1/warnings/feeds-andorra', { timeoutMs: 10_000 })
    const entities = normalizeMeteoalarm(raw, now)
    const newestSent = (raw.warnings ?? []).map((w) => w.alert?.sent).filter((s): s is string => !!s).map((s) => new Date(s).toISOString()).sort().at(-1)
    return { source: 'meteoalarm', fetchedAt: now.toISOString(), sourceUpdatedAt: newestSent, entities }
  },
}
