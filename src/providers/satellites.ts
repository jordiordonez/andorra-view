import { degreesLat, degreesLong, ecfToLookAngles, eciToEcf, eciToGeodetic, gstime, json2satrec, propagate, type OMMJsonObject, type SatRec } from 'satellite.js'
import type { LonLat } from '../config/geo'
import type { GeoEntity } from '../core/types'

/** CelesTrak GP record in OMM JSON form (FORMAT=json). Kept raw so the browser can rebuild satrecs. */
export type OmmRecord = OMMJsonObject & { NORAD_CAT_ID: number | string; OBJECT_NAME: string; EPOCH: string }

export interface SatelliteProps extends Record<string, unknown> {
  noradId: number
  name: string
  objectId?: string
  /** Epoch of the orbital elements (UTC ISO). */
  epoch: string
  /** CelesTrak group(s) the object came from. */
  groups: string[]
  /** Raw OMM record (input for satellite.js json2satrec). */
  omm: OmmRecord
}

export interface SatState {
  latitude: number
  longitude: number
  altitudeKm: number
  /** Look angles from the observer, degrees / km. */
  elevationDeg: number
  azimuthDeg: number
  rangeKm: number
  speedKms: number
}

/** NORAD ids always shown regardless of elevation (crewed stations). */
export const ALWAYS_SHOWN = new Set([25544 /* ISS */, 48274 /* CSS Tianhe */])

const RAD = 180 / Math.PI

export function satrecFromOmm(omm: OmmRecord): SatRec | undefined {
  try {
    const rec = json2satrec(omm)
    return rec.error ? undefined : rec
  } catch {
    return undefined
  }
}

/** SGP4 propagation + look angles from an observer on the ground. Returns undefined on decay/error. */
export function computeSatState(satrec: SatRec, date: Date, observer: LonLat & { heightKm?: number }): SatState | undefined {
  const pv = propagate(satrec, date)
  if (!pv || !pv.position || typeof pv.position !== 'object') return undefined
  const gmst = gstime(date)
  const geo = eciToGeodetic(pv.position, gmst)
  const ecf = eciToEcf(pv.position, gmst)
  const look = ecfToLookAngles(
    { longitude: observer.longitude / RAD, latitude: observer.latitude / RAD, height: observer.heightKm ?? 1.2 },
    ecf,
  )
  const v = pv.velocity
  const state: SatState = {
    latitude: degreesLat(geo.latitude),
    longitude: degreesLong(geo.longitude),
    altitudeKm: geo.height,
    elevationDeg: look.elevation * RAD,
    azimuthDeg: ((look.azimuth * RAD) % 360 + 360) % 360,
    rangeKm: look.rangeSat,
    speedKms: Math.hypot(v.x, v.y, v.z),
  }
  return Object.values(state).every(Number.isFinite) ? state : undefined
}

function epochIso(epoch: string): string {
  // CelesTrak EPOCH has no timezone suffix but is UTC.
  return /[zZ]|[+-]\d\d:?\d\d$/.test(epoch) ? new Date(epoch).toISOString() : new Date(`${epoch}Z`).toISOString()
}

/**
 * Normalize CelesTrak groups into satellite entities (deduplicated by NORAD id). The position is the
 * SGP4 position at `at`; the browser re-propagates every second from `properties.omm`.
 */
export function normalizeCelestrak(groups: Record<string, OmmRecord[]>, at: Date, observer: LonLat, source = 'celestrak'): GeoEntity<SatelliteProps>[] {
  const byId = new Map<number, GeoEntity<SatelliteProps>>()
  for (const [group, records] of Object.entries(groups)) {
    for (const omm of records ?? []) {
      const noradId = Number(omm.NORAD_CAT_ID)
      if (!Number.isFinite(noradId) || !omm.OBJECT_NAME || !omm.EPOCH) continue
      const existing = byId.get(noradId)
      if (existing) {
        if (!existing.properties.groups.includes(group)) existing.properties.groups.push(group)
        continue
      }
      const rec = satrecFromOmm(omm)
      const state = rec && computeSatState(rec, at, observer)
      if (!state) continue
      const epoch = epochIso(omm.EPOCH)
      byId.set(noradId, {
        id: `${source}:${noradId}`,
        type: 'satellite',
        label: omm.OBJECT_NAME.trim(),
        position: { latitude: state.latitude, longitude: state.longitude, altitude: state.altitudeKm * 1000 },
        timestamp: epoch,
        source,
        properties: { noradId, name: omm.OBJECT_NAME.trim(), objectId: omm.OBJECT_ID, epoch, groups: [group], omm },
      })
    }
  }
  return [...byId.values()]
}
