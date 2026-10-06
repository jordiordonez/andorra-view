import { ANDORRA_CENTER } from '../../src/config/geo'
import type { FeedResponse } from '../../src/core/types'
import { normalizeCelestrak, type OmmRecord } from '../../src/providers/satellites'
import { fetchJson } from '../http'
import type { JsonFeed } from './types'

/** CelesTrak updates GP data every ~2 h; their policy asks clients not to download more often. */
const GROUPS = ['stations', 'visual'] as const

export const satellitesFeed: JsonFeed = {
  kind: 'json',
  id: 'satellites',
  sourceId: 'celestrak',
  ttlSeconds: 2 * 3600,
  staleSeconds: 24 * 3600,
  async load({ env }): Promise<FeedResponse> {
    const fetchedAt = new Date()
    const groups: Record<string, OmmRecord[]> = {}
    const errors: string[] = []
    await Promise.all(
      GROUPS.map(async (g) => {
        try {
          groups[g] = await fetchJson<OmmRecord[]>(env, `https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=json`, { timeoutMs: 15_000, retries: 0 })
        } catch (err) {
          errors.push(`${g}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }),
    )
    if (!Object.keys(groups).length) throw new Error(`CelesTrak unavailable (${errors.join('; ')})`)
    const entities = normalizeCelestrak(groups, fetchedAt, ANDORRA_CENTER)
    const newestEpoch = entities.map((e) => e.properties.epoch).sort().at(-1)
    return {
      source: 'celestrak',
      fetchedAt: fetchedAt.toISOString(),
      sourceUpdatedAt: newestEpoch,
      entities,
      warning: errors.length ? `Grups no disponibles: ${errors.join('; ')}` : undefined,
    }
  },
}
