import type { Viewer } from 'cesium'
import { CAMERA_PRESETS, distanceFromAndorraKm, type LonLat } from '../config/geo'
import { getSource } from '../config/dataSources'
import type { LayerManager } from '../core/layerManager'
import type { EntityType, GeoEntity } from '../core/types'
import { flyToPreset, flyToTarget } from '../map/viewer'
import { normalize, searchAll } from '../ui/search'

/**
 * Explicit, LLM-provider-independent application tools (Phase 5 foundation).
 * An AI agent (OpenAI Realtime, Claude tool use, …) maps its tool calls 1:1 onto these methods.
 * Every method returns plain JSON-serializable data including source attribution and timestamps.
 */
export interface AppTools {
  flyTo(target: string | (LonLat & { range?: number })): Promise<{ ok: boolean; target?: string }>
  enableLayer(id: string): Promise<boolean>
  disableLayer(id: string): Promise<boolean>
  listLayers(): Array<{ id: string; title: string; enabled: boolean; count: number; updatedAt?: string; error?: string }>
  searchEntities(query: string, limit?: number): Array<{ id: string; layer: string; label: string; position: LonLat }>
  getEntities(type: EntityType, opts?: { withinKm?: number }): Array<ToolEntity>
  getTrafficIncidents(): Array<ToolEntity>
  getWeather(): Array<ToolEntity>
  getParkingAvailability(): Array<ToolEntity>
  selectEntity(id: string): boolean
}

export interface ToolEntity {
  id: string
  type: EntityType
  label: string
  position: LonLat
  distanceFromAndorraKm: number
  timestamp?: string
  source: { id: string; name?: string; organization?: string; license?: string }
  properties: Record<string, unknown>
}

export function createAppTools(viewer: Viewer, manager: LayerManager, select: (id: string) => boolean): AppTools {
  const toTool = (e: GeoEntity): ToolEntity => {
    const src = getSource(e.source)
    return {
      id: e.id,
      type: e.type,
      label: e.label,
      position: { longitude: e.position.longitude, latitude: e.position.latitude },
      distanceFromAndorraKm: Math.round(distanceFromAndorraKm(e.position) * 10) / 10,
      timestamp: e.timestamp,
      source: { id: e.source, name: src?.name, organization: src?.organization, license: src?.license },
      properties: e.properties,
    }
  }
  const ofType = (types: EntityType[]) =>
    manager
      .allEntities()
      .filter((s) => types.includes(s.entity.type))
      .map((s) => toTool(s.entity))

  return {
    async flyTo(target) {
      if (typeof target === 'string') {
        const q = normalize(target)
        const preset = CAMERA_PRESETS.find((p) => normalize(p.name) === q || normalize(p.id) === q) ?? CAMERA_PRESETS.find((p) => normalize(p.name).includes(q))
        if (preset) {
          await flyToPreset(viewer, preset)
          return { ok: true, target: preset.name }
        }
        const hit = searchAll(manager, target, 1)[0]
        if (hit?.kind === 'entity') {
          await flyToTarget(viewer, hit.selection.entity.position, 3500)
          return { ok: true, target: hit.label }
        }
        return { ok: false }
      }
      await flyToTarget(viewer, target, target.range ?? 5000)
      return { ok: true }
    },
    enableLayer: (id) => manager.setEnabled(id, true),
    disableLayer: (id) => manager.setEnabled(id, false),
    listLayers: () =>
      manager.layers.map((l) => ({ id: l.id, title: l.def.title, enabled: l.state.enabled, count: l.state.count, updatedAt: l.state.sourceUpdatedAt ?? l.state.fetchedAt, error: l.state.error })),
    searchEntities: (query, limit = 10) =>
      searchAll(manager, query, limit)
        .filter((r) => r.kind === 'entity')
        .map((r) => (r.kind === 'entity' ? { id: r.selection.entity.id, layer: r.selection.layer.id, label: r.label, position: r.selection.entity.position } : null!)),
    getEntities: (type, opts) => ofType([type]).filter((e) => !opts?.withinKm || e.distanceFromAndorraKm <= opts.withinKm),
    getTrafficIncidents: () => ofType(['trafficIncident', 'roadClosure']),
    getWeather: () => ofType(['weatherStation', 'weatherAlert', 'avalancheZone']),
    getParkingAvailability: () => ofType(['parking']),
    selectEntity: select,
  }
}
