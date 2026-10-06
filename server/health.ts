export interface FeedHealth {
  id: string
  lastSuccess?: string
  lastError?: string
  lastErrorAt?: string
  latencyMs?: number
  entityCount?: number
  successes: number
  failures: number
}

/** In-memory health counters (per server instance / Worker isolate — indicative, not global). */
export class HealthRegistry {
  private byId = new Map<string, FeedHealth>()

  private get(id: string): FeedHealth {
    let h = this.byId.get(id)
    if (!h) {
      h = { id, successes: 0, failures: 0 }
      this.byId.set(id, h)
    }
    return h
  }

  success(id: string, latencyMs: number, entityCount: number) {
    const h = this.get(id)
    h.lastSuccess = new Date().toISOString()
    h.latencyMs = latencyMs
    h.entityCount = entityCount
    h.successes++
  }

  failure(id: string, message: string, latencyMs: number) {
    const h = this.get(id)
    h.lastError = message
    h.lastErrorAt = new Date().toISOString()
    h.latencyMs = latencyMs
    h.failures++
  }

  snapshot(ids: string[]): FeedHealth[] {
    return ids.map((id) => ({ ...this.get(id) }))
  }
}
