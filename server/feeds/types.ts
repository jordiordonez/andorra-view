import type { FeedResponse } from '../../src/core/types'
import type { Env } from '../env'

export interface FeedContext {
  env: Env
  /** Request URL (feeds may read validated query params). */
  url: URL
}

/** A JSON feed: fetches upstream, normalizes through a provider adapter, returns a FeedResponse. */
export interface JsonFeed {
  kind: 'json'
  id: string
  /** Registered source id(s) the data comes from. */
  sourceId: string
  /** Seconds a cached response is served without hitting upstream. */
  ttlSeconds: number
  /** Extra seconds a cached copy may be served (flagged stale) when upstream fails. */
  staleSeconds: number
  load(ctx: FeedContext): Promise<FeedResponse>
}

/** A binary passthrough (e.g. webcam images) addressed by an id path segment. */
export interface BinaryFeed {
  kind: 'binary'
  id: string
  sourceId: string
  ttlSeconds: number
  staleSeconds: number
  /** Must validate `key` against a known list — never proxy arbitrary URLs. */
  load(ctx: FeedContext, key: string): Promise<{ body: ArrayBuffer; contentType: string }>
}

export type Feed = JsonFeed | BinaryFeed
