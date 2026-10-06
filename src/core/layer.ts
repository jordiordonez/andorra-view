import type { Viewer } from 'cesium'
import { CustomDataSource } from 'cesium'
import { getSource, type DataSource } from '../config/dataSources'
import type { EntityDetails } from './details'
import { Emitter } from './emitter'
import { health } from './health'
import type { FeedResponse, GeoEntity } from './types'

export type LayerGroup = 'mobility' | 'weather' | 'environment' | 'emergency' | 'sky' | 'context'

export interface LayerState {
  enabled: boolean
  loading: boolean
  error?: string
  /** Ingestion timestamp of the data currently shown. */
  fetchedAt?: string
  /** Newest source observation timestamp. */
  sourceUpdatedAt?: string
  stale?: boolean
  warning?: string
  count: number
  /** Source id that produced the current data (may differ from the primary on fallback). */
  activeSource?: string
}

export interface LayerDefinition {
  id: string
  title: string
  group: LayerGroup
  /** Registered source ids (first = primary). */
  sources: string[]
  defaultEnabled?: boolean
  /** Poll interval in ms; 0 = load once. Defaults to the primary source refresh interval. */
  refreshMs?: number
  /** Short description for the layer panel. */
  description?: string
}

/**
 * Base class for every map layer. Owns its Cesium data source, its polling loop, its loading / error
 * state and the health reporting, so that a failure in one provider can never affect another layer.
 */
export abstract class Layer {
  readonly dataSource: CustomDataSource
  readonly stateChanged = new Emitter<LayerState>()
  protected viewer!: Viewer
  protected entities: GeoEntity[] = []
  private timer?: ReturnType<typeof setTimeout>
  private generation = 0
  state: LayerState = { enabled: false, loading: false, count: 0 }

  constructor(readonly def: LayerDefinition) {
    this.dataSource = new CustomDataSource(def.id)
    this.dataSource.show = false
  }

  get id() {
    return this.def.id
  }

  get primarySource(): DataSource | undefined {
    return getSource(this.def.sources[0])
  }

  get refreshMs(): number {
    return this.def.refreshMs ?? this.primarySource?.refreshInterval ?? 0
  }

  async attach(viewer: Viewer) {
    this.viewer = viewer
    await viewer.dataSources.add(this.dataSource)
  }

  /** Fetch normalized data. Implementations must not touch Cesium here. */
  protected abstract load(): Promise<FeedResponse>

  /** Render normalized entities into `this.dataSource`. */
  protected abstract render(entities: GeoEntity[]): void

  /** Optional per-second hook (e.g. satellite propagation, aircraft dead-reckoning). */
  tick?(now: Date): void

  /** Detail panel content. Source, timestamps and licence notes are added by the panel itself. */
  describe(entity: GeoEntity): EntityDetails {
    return {
      title: entity.label,
      fields: Object.entries(entity.properties)
        .filter(([, v]) => v !== undefined && v !== null && typeof v !== 'object')
        .map(([k, v]) => ({ label: k, value: String(v) })),
    }
  }

  /** Extra text indexed by search (label is always indexed). */
  searchText(entity: GeoEntity): string {
    return entity.label
  }

  getEntities(): readonly GeoEntity[] {
    return this.entities
  }

  findEntity(id: string): GeoEntity | undefined {
    return this.entities.find((e) => e.id === id)
  }

  private setState(patch: Partial<LayerState>) {
    this.state = { ...this.state, ...patch }
    this.stateChanged.emit(this.state)
  }

  async enable() {
    if (this.state.enabled) return
    this.setState({ enabled: true })
    this.dataSource.show = true
    await this.refresh()
  }

  disable() {
    if (!this.state.enabled) return
    this.generation++
    clearTimeout(this.timer)
    this.dataSource.show = false
    this.setState({ enabled: false, loading: false })
    for (const s of this.def.sources) health.update(s, { status: 'disabled' })
  }

  toggle(on = !this.state.enabled) {
    return on ? this.enable() : this.disable()
  }

  async refresh() {
    if (!this.state.enabled) return
    clearTimeout(this.timer)
    const gen = ++this.generation
    this.setState({ loading: true })
    const primary = this.def.sources[0]
    health.update(primary, { status: 'loading' })
    const started = performance.now()
    try {
      const data = await this.load()
      if (gen !== this.generation) return
      this.entities = data.entities
      this.render(data.entities)
      this.viewer?.scene.requestRender()
      const sourceId = data.source || primary
      health.update(sourceId, {
        status: data.stale ? 'stale' : 'ok',
        lastSuccess: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - started),
        entityCount: data.entities.length,
        sourceUpdatedAt: data.sourceUpdatedAt,
        fetchedAt: data.fetchedAt,
        warning: data.warning,
      })
      this.setState({
        loading: false,
        error: undefined,
        fetchedAt: data.fetchedAt,
        sourceUpdatedAt: data.sourceUpdatedAt,
        stale: data.stale,
        warning: data.warning,
        count: data.entities.length,
        activeSource: sourceId,
      })
    } catch (err) {
      if (gen !== this.generation) return
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[layer:${this.id}]`, err)
      health.update(primary, { status: 'error', lastError: message, lastErrorAt: new Date().toISOString() })
      // Keep showing the previous entities (if any) — they keep their own timestamps.
      this.setState({ loading: false, error: message })
    } finally {
      if (gen === this.generation) this.schedule()
    }
  }

  private schedule() {
    const ms = this.refreshMs
    if (!ms || !this.state.enabled) return
    // Back off while the tab is hidden; resumed by LayerManager on visibilitychange.
    if (typeof document !== 'undefined' && document.hidden) return
    this.timer = setTimeout(() => this.refresh(), ms)
  }

  /** Called when the page becomes visible again. */
  resume() {
    if (!this.state.enabled) return
    const last = this.state.fetchedAt ? Date.parse(this.state.fetchedAt) : 0
    if (Date.now() - last >= this.refreshMs) this.refresh()
    else {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.refresh(), this.refreshMs - (Date.now() - last))
    }
  }
}
