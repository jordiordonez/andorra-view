import type { Feature, FeatureCollection, Point } from 'geojson'
import { haversineKm } from '../config/geo'
import type { GeoEntity } from '../core/types'
import type { ParkingProps } from './mobilitat'

/**
 * Comú d'Andorra la Vella municipal car parks (ArcGIS FeatureServer, read-only GET).
 * FREEOCCUPANCY / TOTALOCCUPANCY are filled for car parks with counters; the service exposes no
 * update timestamp, so freshness is unknown (see docs/research/02).
 */

export const ALV_PARKING_URL =
  'https://sit.andorralavella.ad/server/rest/services/Aparcaments/AparcamentsComunals_SQLserver/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson'

interface AlvProps {
  OBJECTID?: number
  ID_POI?: number
  NOM?: string
  POBLACIO?: string
  PARROQUIA?: string
  PREU_HORA?: number | null
  PROPI?: string
  FREEOCCUPANCY?: number | null
  TOTALOCCUPANCY?: number | null
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

export function normalizeAlvParking(fc: FeatureCollection, source = 'alv-parking'): GeoEntity<ParkingProps>[] {
  const out: GeoEntity<ParkingProps>[] = []
  for (const f of (fc.features ?? []) as Feature<Point, AlvProps>[]) {
    if (f?.geometry?.type !== 'Point') continue
    const [lon, lat] = f.geometry.coordinates
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
    const p = f.properties ?? {}
    const free = num(p.FREEOCCUPANCY)
    const total = num(p.TOTALOCCUPANCY)
    const live = free !== undefined && total !== undefined && total > 0 && free >= 0 && free <= total
    const id = p.ID_POI ?? p.OBJECTID
    if (id === undefined) continue
    const price = num(p.PREU_HORA)
    out.push({
      id: `${source}:${id}`,
      type: 'parking',
      label: (p.NOM ?? 'Aparcament').trim(),
      position: { latitude: lat, longitude: lon },
      source,
      properties: {
        free: live ? free : undefined,
        total: live ? total : undefined,
        capacity: live ? total : undefined,
        occupancyPct: live ? Math.round(((total! - free!) / total!) * 100) : undefined,
        live,
        // Float artefacts in the source (2.4000001) → round to cents.
        pricePerHour: price !== undefined ? Math.round(price * 100) / 100 : undefined,
        operator: p.PROPI?.trim() || undefined,
        parish: p.PARROQUIA?.trim() || undefined,
        origin: 'alv-live',
      },
    })
  }
  return out
}

/** Occupancy level for colouring. */
export function occupancyLevel(p: ParkingProps): 'free' | 'busy' | 'full' | 'unknown' {
  if (!p.live || p.free === undefined || p.total === undefined) return 'unknown'
  const ratio = p.free / p.total
  if (p.free === 0 || ratio < 0.05) return 'full'
  if (ratio < 0.2) return 'busy'
  return 'free'
}

/**
 * Merge Mobilitat (static, nationwide) and Andorra la Vella (possibly live) car parks.
 * A Mobilitat car park within `radiusM` of an ALV one is considered the same and dropped.
 */
export function mergeParkings(alv: GeoEntity<ParkingProps>[], mobilitat: GeoEntity<ParkingProps>[], radiusM = 60): GeoEntity<ParkingProps>[] {
  const kept = mobilitat.filter((m) => !alv.some((a) => haversineKm(a.position, m.position) * 1000 < radiusM))
  return [...alv, ...kept]
}
