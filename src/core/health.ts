import { Emitter } from './emitter'

export type SourceStatus = 'idle' | 'loading' | 'ok' | 'stale' | 'error' | 'disabled'

export interface SourceHealth {
  sourceId: string
  status: SourceStatus
  lastSuccess?: string
  lastError?: string
  lastErrorAt?: string
  latencyMs?: number
  entityCount?: number
  /** Newest observation timestamp reported by the source. */
  sourceUpdatedAt?: string
  /** When our backend fetched it (ingestion). */
  fetchedAt?: string
  warning?: string
}

/** Client-side source health registry (feeds the status panel and the future /status page). */
class HealthStore {
  private map = new Map<string, SourceHealth>()
  readonly changed = new Emitter<SourceHealth>()

  get(sourceId: string): SourceHealth {
    return this.map.get(sourceId) ?? { sourceId, status: 'idle' }
  }

  all(): SourceHealth[] {
    return [...this.map.values()]
  }

  update(sourceId: string, patch: Partial<SourceHealth>) {
    const next = { ...this.get(sourceId), ...patch, sourceId }
    this.map.set(sourceId, next)
    this.changed.emit(next)
  }
}

export const health = new HealthStore()
