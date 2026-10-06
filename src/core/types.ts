import type { Geometry } from 'geojson'

/**
 * Normalized internal model. Provider adapters convert raw upstream formats into these types;
 * nothing downstream (layers, UI, agent tools) may depend on a provider's raw format.
 */

export type EntityType =
  | 'aircraft'
  | 'satellite'
  | 'fire'
  | 'earthquake'
  | 'trafficIncident'
  | 'roadClosure'
  | 'webcam'
  | 'parking'
  | 'evCharger'
  | 'busStop'
  | 'busLine'
  | 'weatherStation'
  | 'weatherAlert'
  | 'avalancheZone'
  | 'airQuality'
  | 'sensor'
  | 'infrastructure'
  | 'place'
  | 'boundary'
  | 'road'

export interface Position {
  latitude: number
  longitude: number
  /** Metres above ellipsoid / MSL as reported by the source (see properties for datum). */
  altitude?: number
}

export interface GeoEntity<P extends Record<string, unknown> = Record<string, unknown>> {
  /** Stable id, unique within its source (prefixed with source id by adapters). */
  id: string
  type: EntityType
  /** Short human label (callsign, camera name, station name…). */
  label: string
  position: Position
  /** Optional geometry for non-point features (alert zones, lines). `position` is then a representative point. */
  geometry?: Geometry
  /** ISO timestamp of the observation according to the source, when it provides one. */
  timestamp?: string
  /** Registered source id (see src/config/dataSources.ts). */
  source: string
  properties: P
}

/** Envelope returned by every feed (API proxy or direct browser fetch). */
export interface FeedResponse<P extends Record<string, unknown> = Record<string, unknown>> {
  source: string
  /** When our system fetched the data from upstream (ingestion timestamp). */
  fetchedAt: string
  /** Newest observation timestamp reported by the source, if any. */
  sourceUpdatedAt?: string
  /** True when upstream failed and this is the last-known-good copy. */
  stale?: boolean
  entities: GeoEntity<P>[]
  /** Non-geographic summary values (e.g. FEDA energy totals). */
  meta?: Record<string, unknown>
  /** Human-readable note on degraded data (e.g. "upstream timeout, showing cached copy"). */
  warning?: string
}

/** Freshness class, displayed on every layer and entity. */
export type Freshness = 'live' | 'near-real-time' | 'periodic' | 'static' | 'simulated'
