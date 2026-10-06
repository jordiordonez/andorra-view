/**
 * Small cache abstraction: in-memory in dev, Cloudflare Cache API in production.
 * Entries are kept beyond their freshness TTL so the router can serve last-known-good data
 * when upstream fails.
 */
export interface CachedEntry {
  body: ArrayBuffer
  contentType: string
  /** Epoch ms when the entry was stored. */
  storedAt: number
}

export interface CacheStore {
  get(key: string): Promise<CachedEntry | undefined>
  /** `keepSeconds` = how long the entry may be kept at all (fresh TTL + stale window). */
  put(key: string, entry: CachedEntry, keepSeconds: number): Promise<void>
}

export class MemoryCache implements CacheStore {
  private entries = new Map<string, { entry: CachedEntry; expires: number }>()

  constructor(private maxEntries = 500) {}

  async get(key: string) {
    const hit = this.entries.get(key)
    if (!hit) return undefined
    if (hit.expires < Date.now()) {
      this.entries.delete(key)
      return undefined
    }
    return hit.entry
  }

  async put(key: string, entry: CachedEntry, keepSeconds: number) {
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) this.entries.delete(oldest)
    }
    this.entries.set(key, { entry, expires: Date.now() + keepSeconds * 1000 })
  }
}

/** Cloudflare Workers Cache API (per data centre). */
export class EdgeCache implements CacheStore {
  constructor(private cache: Cache) {}

  private keyUrl(key: string) {
    return `https://andorra-view.cache/${encodeURIComponent(key)}`
  }

  async get(key: string) {
    const res = await this.cache.match(this.keyUrl(key))
    if (!res) return undefined
    return {
      body: await res.arrayBuffer(),
      contentType: res.headers.get('Content-Type') ?? 'application/octet-stream',
      storedAt: Number(res.headers.get('X-Stored-At') ?? 0),
    }
  }

  async put(key: string, entry: CachedEntry, keepSeconds: number) {
    await this.cache.put(
      this.keyUrl(key),
      new Response(entry.body, {
        headers: {
          'Content-Type': entry.contentType,
          'Cache-Control': `public, max-age=${keepSeconds}`,
          'X-Stored-At': String(entry.storedAt),
        },
      }),
    )
  }
}
