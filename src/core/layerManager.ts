import type { Entity, Viewer } from 'cesium'
import { Emitter } from './emitter'
import type { Layer } from './layer'
import type { GeoEntity } from './types'

const STORAGE_KEY = 'andorra-view:layers'

function readSaved(): Record<string, boolean> | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : undefined
  } catch {
    return undefined
  }
}

function save(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable (private mode) — not critical */
  }
}

export interface Selection {
  layer: Layer
  entity: GeoEntity
}

/** Registry of layers: lifecycle, persistence of on/off state, entity lookup for picking and search. */
export class LayerManager {
  readonly layers: Layer[] = []
  readonly changed = new Emitter<Layer>()
  private readonly byId = new Map<string, Layer>()

  constructor(private viewer: Viewer) {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) for (const l of this.layers) l.resume()
    })
  }

  async register(layer: Layer) {
    this.layers.push(layer)
    this.byId.set(layer.id, layer)
    layer.stateChanged.on(() => this.changed.emit(layer))
    await layer.attach(this.viewer)
  }

  get(id: string) {
    return this.byId.get(id)
  }

  /** Enable layers from saved preferences, or their defaults. Failures stay inside each layer. */
  async start() {
    const saved = readSaved()
    await Promise.allSettled(
      this.layers.map((l) => {
        const on = saved?.[l.id] ?? l.def.defaultEnabled ?? false
        return on ? l.enable() : Promise.resolve()
      }),
    )
  }

  async setEnabled(id: string, on: boolean) {
    const layer = this.byId.get(id)
    if (!layer) return false
    await layer.toggle(on)
    this.persist()
    return true
  }

  private persist() {
    save(Object.fromEntries(this.layers.map((l) => [l.id, l.state.enabled])))
  }

  /** Map a picked Cesium entity back to its layer + normalized entity. */
  resolvePick(picked: Entity | undefined): Selection | undefined {
    if (!picked) return undefined
    const geoId = (picked.properties?.getValue(this.viewer.clock.currentTime) as { geoId?: string } | undefined)?.geoId ?? picked.id
    for (const layer of this.layers) {
      if (!layer.state.enabled) continue
      if (!layer.dataSource.entities.contains(picked) && !layer.dataSource.entities.getById(picked.id)) continue
      const entity = layer.findEntity(geoId)
      if (entity) return { layer, entity }
    }
    return undefined
  }

  allEntities(): Selection[] {
    const out: Selection[] = []
    for (const layer of this.layers) for (const entity of layer.getEntities()) out.push({ layer, entity })
    return out
  }

  tick(now: Date) {
    for (const l of this.layers) if (l.state.enabled && l.tick) l.tick(now)
  }
}
