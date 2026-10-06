import type { CustomDataSource, Entity } from 'cesium'
import type { GeoEntity } from '../core/types'

/**
 * Diff normalized entities into a Cesium data source: update existing Cesium entities in place,
 * create new ones, remove vanished ones. Cesium entity id === GeoEntity id (used for picking).
 */
export function syncEntities<T extends GeoEntity>(
  ds: CustomDataSource,
  items: readonly T[],
  create: (item: T) => Entity.ConstructorOptions,
  update?: (entity: Entity, item: T) => void,
) {
  const seen = new Set<string>()
  ds.entities.suspendEvents()
  try {
    for (const item of items) {
      seen.add(item.id)
      const existing = ds.entities.getById(item.id)
      if (existing && update) update(existing, item)
      else if (existing) {
        ds.entities.remove(existing)
        ds.entities.add({ ...create(item), id: item.id })
      } else ds.entities.add({ ...create(item), id: item.id })
    }
    for (const e of [...ds.entities.values]) if (!seen.has(e.id)) ds.entities.remove(e)
  } finally {
    ds.entities.resumeEvents()
  }
}
