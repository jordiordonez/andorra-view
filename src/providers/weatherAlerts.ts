import type { MultiPolygon, Polygon } from 'geojson'
import { ANDORRA_CENTER } from '../config/geo'
import type { GeoEntity } from '../core/types'

export type Severity = 'Minor' | 'Moderate' | 'Severe' | 'Extreme' | 'Unknown'

export interface WeatherAlertProps extends Record<string, unknown> {
  identifier: string
  event: string
  headline?: string
  description?: string
  instruction?: string
  severity: Severity
  certainty?: string
  urgency?: string
  /** Meteoalarm awareness level colour: yellow | orange | red (from awareness_level parameter). */
  awarenessLevel?: string
  awarenessType?: string
  areaDesc: string
  onset?: string
  expires?: string
  sent?: string
  language: string
  /** 'active' when onset ≤ now < expires, 'upcoming' when onset is in the future. */
  status: 'active' | 'upcoming'
  web?: string
  sender?: string
}

interface CapInfo {
  language?: string
  event?: string
  headline?: string
  description?: string
  instruction?: string
  severity?: string
  certainty?: string
  urgency?: string
  onset?: string
  effective?: string
  expires?: string
  web?: string
  senderName?: string
  parameter?: Array<{ valueName: string; value: string }>
  area?: Array<{ areaDesc?: string; polygon?: string[] }>
}

export interface MeteoalarmResponse {
  warnings?: Array<{ uuid?: string; alert: { identifier: string; msgType?: string; status?: string; sent?: string; info?: CapInfo[] } }>
}

const LANG_PREFERENCE = ['ca', 'en', 'es', 'fr']

function pickInfo(infos: CapInfo[]): CapInfo | undefined {
  for (const lang of LANG_PREFERENCE) {
    const hit = infos.find((i) => i.language?.toLowerCase().startsWith(lang))
    if (hit) return hit
  }
  return infos[0]
}

/** CAP polygon: space-separated "lat,lon" pairs → GeoJSON ring [lon, lat]. */
export function capPolygonToRing(s: string): number[][] {
  const ring = s
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter((p) => p.length === 2 && p.every(Number.isFinite))
    .map(([lat, lon]) => [lon, lat])
  if (ring.length > 2) {
    const [a, b] = [ring[0], ring[ring.length - 1]]
    if (a[0] !== b[0] || a[1] !== b[1]) ring.push([...a])
  }
  return ring
}

function param(info: CapInfo, name: string) {
  return info.parameter?.find((p) => p.valueName === name)?.value
}

const SEVERITIES: Severity[] = ['Minor', 'Moderate', 'Severe', 'Extreme']

/** Normalize Meteoalarm JSON: drops expired/cancelled alerts, prefers Catalan text. */
export function normalizeMeteoalarm(raw: MeteoalarmResponse, now = new Date(), source = 'meteoalarm'): GeoEntity<WeatherAlertProps>[] {
  const out: GeoEntity<WeatherAlertProps>[] = []
  for (const w of raw.warnings ?? []) {
    const alert = w.alert
    if (!alert || alert.msgType === 'Cancel' || (alert.status && alert.status !== 'Actual')) continue
    const info = pickInfo(alert.info ?? [])
    if (!info) continue
    const expires = info.expires ? Date.parse(info.expires) : undefined
    if (expires !== undefined && expires <= now.getTime()) continue
    const onset = info.onset ?? info.effective
    const rings = (info.area ?? []).flatMap((a) => (a.polygon ?? []).map(capPolygonToRing)).filter((r) => r.length >= 4)
    const geometry: Polygon | MultiPolygon | undefined =
      rings.length === 1 ? { type: 'Polygon', coordinates: [rings[0]] } : rings.length > 1 ? { type: 'MultiPolygon', coordinates: rings.map((r) => [r]) } : undefined
    const allPts = rings.flat()
    const position = allPts.length
      ? { longitude: allPts.reduce((s, p) => s + p[0], 0) / allPts.length, latitude: allPts.reduce((s, p) => s + p[1], 0) / allPts.length }
      : { ...ANDORRA_CENTER }
    const severity = (SEVERITIES as string[]).includes(info.severity ?? '') ? (info.severity as Severity) : 'Unknown'
    const level = param(info, 'awareness_level')
    const areaDesc = (info.area ?? []).map((a) => a.areaDesc).filter(Boolean).join(', ') || 'Andorra'
    out.push({
      id: `${source}:${alert.identifier}`,
      type: 'weatherAlert',
      label: `${info.event ?? 'Avís'} · ${areaDesc}`,
      position,
      geometry,
      timestamp: alert.sent ? new Date(alert.sent).toISOString() : undefined,
      source,
      properties: {
        identifier: alert.identifier,
        event: info.event ?? 'Avís meteorològic',
        headline: info.headline,
        description: info.description,
        instruction: info.instruction,
        severity,
        certainty: info.certainty,
        urgency: info.urgency,
        awarenessLevel: level?.split(';')[1]?.trim(),
        awarenessType: param(info, 'awareness_type')?.split(';')[1]?.trim(),
        areaDesc,
        onset: onset ? new Date(onset).toISOString() : undefined,
        expires: expires !== undefined ? new Date(expires).toISOString() : undefined,
        sent: alert.sent ? new Date(alert.sent).toISOString() : undefined,
        language: info.language ?? '',
        status: onset && Date.parse(onset) > now.getTime() ? 'upcoming' : 'active',
        web: info.web,
        sender: info.senderName,
      },
    })
  }
  return out
}
