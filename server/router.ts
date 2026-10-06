import type { CacheStore } from './cache'
import type { Env } from './env'
import type { Feed } from './feeds/types'
import { FEEDS } from './feeds/index'
import { HealthRegistry } from './health'
import { UpstreamError } from './http'

/**
 * Framework-free API router: (Request) → Response. Used by the Cloudflare Worker in production and
 * mounted as Vite middleware in development, so `npm run dev` needs nothing else.
 *
 * Routes:
 *   GET /api/feeds/:id            normalized FeedResponse JSON
 *   GET /api/binary/:id/:key      cached binary passthrough (webcam images)
 *   GET /api/status               per-feed health as seen by this server instance
 */

const feedsById = new Map<string, Feed>(FEEDS.map((f) => [f.id, f]))
const inflight = new Map<string, Promise<Response>>()
export const serverHealth = new HealthRegistry()

const RATE_LIMIT_PER_MIN = 240
const rateBuckets = new Map<string, { count: number; windowStart: number }>()

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? '*').split(',').map((s) => s.trim())
  const origin = req.headers.get('Origin')
  const allowOrigin = allowed.includes('*') ? '*' : origin && allowed.includes(origin) ? origin : ''
  const headers: Record<string, string> = { Vary: 'Origin' }
  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    headers['Access-Control-Expose-Headers'] = 'X-Cache, X-Stored-At'
  }
  return headers
}

function json(body: unknown, status: number, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  })
}

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)
  if (!bucket || now - bucket.windowStart > 60_000) {
    rateBuckets.set(ip, { count: 1, windowStart: now })
    if (rateBuckets.size > 10_000) rateBuckets.clear()
    return false
  }
  bucket.count++
  return bucket.count > RATE_LIMIT_PER_MIN
}

async function serveFeed(feed: Feed, key: string | undefined, url: URL, env: Env, cache: CacheStore): Promise<Response> {
  const cacheKey = `${feed.id}:${key ?? ''}`
  const cached = await cache.get(cacheKey)
  const age = cached ? (Date.now() - cached.storedAt) / 1000 : Infinity
  const browserMaxAge = Math.max(1, Math.min(feed.ttlSeconds, 60))

  const respond = (body: ArrayBuffer, contentType: string, storedAt: number, state: 'HIT' | 'MISS' | 'STALE') =>
    new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${state === 'STALE' ? 5 : browserMaxAge}`,
        'X-Cache': state,
        'X-Stored-At': new Date(storedAt).toISOString(),
      },
    })

  if (cached && age < feed.ttlSeconds) return respond(cached.body, cached.contentType, cached.storedAt, 'HIT')

  const started = Date.now()
  try {
    let body: ArrayBuffer
    let contentType: string
    if (feed.kind === 'json') {
      const data = await feed.load({ env, url })
      serverHealth.success(feed.id, Date.now() - started, data.entities.length)
      body = new TextEncoder().encode(JSON.stringify(data)).buffer as ArrayBuffer
      contentType = 'application/json; charset=utf-8'
    } else {
      const out = await feed.load({ env, url }, key ?? '')
      serverHealth.success(feed.id, Date.now() - started, 1)
      body = out.body
      contentType = out.contentType
    }
    const storedAt = Date.now()
    await cache.put(cacheKey, { body, contentType, storedAt }, feed.ttlSeconds + feed.staleSeconds)
    return respond(body, contentType, storedAt, 'MISS')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Client errors (bad/unknown key) are not upstream failures: answer 4xx and leave health untouched.
    if (err instanceof UpstreamError && err.status && err.status >= 400 && err.status < 500 && feed.kind === 'binary') {
      return json({ error: err.status === 404 ? 'not_found' : 'bad_request', message }, err.status)
    }
    serverHealth.failure(feed.id, message, Date.now() - started)
    if (cached && age < feed.ttlSeconds + feed.staleSeconds) {
      // Last-known-good copy, explicitly flagged so the UI never presents it as live.
      if (feed.kind === 'json') {
        const data = JSON.parse(new TextDecoder().decode(cached.body))
        data.stale = true
        data.warning = `Upstream error (${message}); showing copy from ${new Date(cached.storedAt).toISOString()}`
        return respond(new TextEncoder().encode(JSON.stringify(data)).buffer as ArrayBuffer, cached.contentType, cached.storedAt, 'STALE')
      }
      return respond(cached.body, cached.contentType, cached.storedAt, 'STALE')
    }
    return json({ error: 'upstream_unavailable', feed: feed.id, message }, 502)
  }
}

export async function handleApiRequest(req: Request, env: Env, cache: CacheStore): Promise<Response> {
  const url = new URL(req.url)
  const cors = corsHeaders(req, env)
  const withCors = (res: Response) => {
    const out = new Response(res.body, res)
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v)
    return out
  }

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'GET') return withCors(json({ error: 'method_not_allowed' }, 405))

  const ip = req.headers.get('CF-Connecting-IP') ?? req.headers.get('X-Forwarded-For') ?? 'local'
  if (rateLimited(ip)) return withCors(json({ error: 'rate_limited' }, 429, { 'Retry-After': '30' }))

  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  const [route, id, key] = parts

  if (route === 'status') {
    return withCors(json({ now: new Date().toISOString(), feeds: serverHealth.snapshot(FEEDS.map((f) => f.id)) }, 200, { 'Cache-Control': 'no-store' }))
  }

  const feed = id ? feedsById.get(id) : undefined
  if (!feed || (route === 'feeds' && feed.kind !== 'json') || (route === 'binary' && (feed.kind !== 'binary' || !key))) {
    return withCors(json({ error: 'not_found' }, 404))
  }
  if (route !== 'feeds' && route !== 'binary') return withCors(json({ error: 'not_found' }, 404))

  // Collapse concurrent cache misses into one upstream request per feed/key.
  const flightKey = `${feed.id}:${key ?? ''}`
  let pending = inflight.get(flightKey)
  if (!pending) {
    pending = serveFeed(feed, key, url, env, cache).finally(() => inflight.delete(flightKey))
    inflight.set(flightKey, pending)
  }
  const res = await pending
  return withCors(res.clone())
}
