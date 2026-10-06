import { ANDORRA_BBOX, expandBBox, inBBox } from '../config/geo'
import type { GeoEntity } from '../core/types'

/**
 * Adapters for the public (undocumented) Mobilitat Andorra API at https://app.mobilitat.ad/api/v1/.
 * Endpoints used: incidents/ca, cameras, points/ca. See docs/research/02-andorra-gov-mobility.md.
 */

/** Small buffer: Mobilitat cameras/incidents sit on Andorran roads, incl. the border posts. */
export const MOBILITAT_BBOX = expandBBox(ANDORRA_BBOX, 0.05)

export interface MobilitatEnvelope<T> {
  success?: boolean
  result?: T[]
}

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  agrave: 'à',
  aacute: 'á',
  egrave: 'è',
  eacute: 'é',
  iacute: 'í',
  igrave: 'ì',
  ograve: 'ò',
  oacute: 'ó',
  uacute: 'ú',
  ugrave: 'ù',
  ccedil: 'ç',
  middot: '·',
  iuml: 'ï',
  uuml: 'ü',
  Agrave: 'À',
  Eacute: 'É',
  Egrave: 'È',
  Ograve: 'Ò',
  Oacute: 'Ó',
  Ccedil: 'Ç',
  micro: 'µ',
  ordf: 'ª',
  ordm: 'º',
  deg: '°',
}

/** Decode HTML entities (named subset + numeric). */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name] ?? m)
}

/** Strip tags, decode entities, collapse whitespace. */
export function stripHtml(html: unknown): string {
  if (typeof html !== 'string') return ''
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li|div)>/gi, '\n')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

function coord(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN
  return Number.isFinite(n) ? n : undefined
}

/** Mobilitat datetimes are local Andorra time without offset (e.g. "2026-04-07T07:46:00"). */
export function parseLocalDate(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v) return undefined
  if (v.startsWith('9999')) return undefined // "no end date"
  const m = v.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?/)
  if (!m) return undefined
  const [, y, mo, d, h, mi, s] = m
  // Andorra: CET/CEST. Compute the offset for that date with Intl (works in Workers and browsers).
  const guessUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0))
  const offsetMin = tzOffsetMinutes(guessUtc, 'Europe/Andorra')
  return new Date(guessUtc - offsetMin * 60_000).toISOString()
}

export function tzOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - utcMs) / 60_000)
}

// ------------------------------------------------------------------ incidents

export interface RawIncident {
  id: number
  category_id?: number
  category?: { id?: number; classification?: string; title?: string }
  title?: string
  text?: string
  init_date?: string
  final_date?: string
  important?: boolean
  has_gps?: boolean
  lat?: string | number
  lng?: string | number
  image?: string
}

export type IncidentKind = 'works' | 'closure' | 'snow' | 'accident' | 'weather' | 'restriction' | 'info' | 'other'

export interface IncidentProps extends Record<string, unknown> {
  incidentId: number
  category?: string
  /** Mobilitat colour class: VERMELL (red) / TARONJA (orange) / BLAU (blue). */
  severity?: string
  kind: IncidentKind
  description?: string
  start?: string
  /** undefined = no end date announced. */
  end?: string
  important: boolean
  /** Link to the upstream illustrative image (not proxied). */
  imageUrl?: string
}

export function classifyIncident(category: string, title: string): { kind: IncidentKind; closure: boolean } {
  const c = category.toLowerCase()
  const t = title.toLowerCase()
  const closure = /\btall(s|at|ada)?\b|tancament|tancad|tallad|carretera tancada/.test(`${c} ${t}`)
  let kind: IncidentKind = 'other'
  if (c.includes('obres')) kind = 'works'
  else if (c.includes('neu')) kind = 'snow'
  else if (c.includes('accident')) kind = 'accident'
  else if (c.includes('talls')) kind = 'closure'
  else if (c.includes('restricci')) kind = 'restriction'
  else if (/vent|tempesta|pluja|incendi|temperatura/.test(c)) kind = 'weather'
  else if (c.includes('informaci')) kind = 'info'
  if (closure && kind !== 'works') kind = 'closure'
  return { kind, closure: closure || c.includes('talls') }
}

export interface IncidentsResult {
  entities: GeoEntity<IncidentProps>[]
  withoutLocation: Array<{ id: number; title: string; category?: string }>
}

export function normalizeIncidents(raw: MobilitatEnvelope<RawIncident>, source = 'mobilitat-incidents'): IncidentsResult {
  const entities: GeoEntity<IncidentProps>[] = []
  const withoutLocation: IncidentsResult['withoutLocation'] = []
  for (const r of raw.result ?? []) {
    if (typeof r?.id !== 'number') continue
    const title = stripHtml(r.title) || 'Incidència'
    const category = r.category?.title?.trim()
    const lat = coord(r.lat)
    const lon = coord(r.lng)
    if (!r.has_gps || lat === undefined || lon === undefined || !inBBox(lon, lat, MOBILITAT_BBOX)) {
      withoutLocation.push({ id: r.id, title, category })
      continue
    }
    const { kind, closure } = classifyIncident(category ?? '', title)
    const start = parseLocalDate(r.init_date)
    entities.push({
      id: `${source}:${r.id}`,
      type: closure ? 'roadClosure' : 'trafficIncident',
      label: title,
      position: { latitude: lat, longitude: lon },
      timestamp: start,
      source,
      properties: {
        incidentId: r.id,
        category,
        severity: r.category?.classification?.trim() || undefined,
        kind,
        description: stripHtml(r.text) || undefined,
        start,
        end: parseLocalDate(r.final_date),
        important: !!r.important,
        imageUrl: typeof r.image === 'string' && r.image.startsWith('https://') ? r.image : undefined,
      },
    })
  }
  return { entities, withoutLocation }
}

// ------------------------------------------------------------------ cameras

export interface RawCamera {
  id: number
  title?: string
  lat?: string | number
  lng?: string | number
  url_gif?: string
  category_id?: number
}

export interface WebcamProps extends Record<string, unknown> {
  cameraId: number
  /** Altitude in metres parsed from the title suffix ("/ 1.024 metres"). */
  altitudeM?: number
  zone?: string
  /** Upstream image URL (allow-listed host only); the browser loads it through /api/binary/webcam-image/<id>. */
  upstreamUrl: string
}

/** Camera zones from categories/ca (categories_camares). */
export const CAMERA_ZONES: Record<number, string> = {
  1: 'Frontera amb Espanya',
  2: 'Frontera amb França',
  3: 'Canillo',
  4: 'Encamp',
  5: 'Ordino',
  6: 'La Massana',
  7: 'Andorra la Vella',
  8: 'Escaldes-Engordany',
  9: 'Sant Julià de Lòria',
}

export const WEBCAM_IMAGE_HOST = 'imgs.mobilitat.ad'

/** Split "CG3 / PK 0+441 (…) / 1.025 metres" into name + altitude (Catalan thousands separator). */
export function splitCameraTitle(title: string): { name: string; altitudeM?: number } {
  const m = title.match(/^(.*?)\s*(?:\/\s*)?([\d.]+)\s*metres\s*$/i)
  if (!m) return { name: title.trim() }
  const alt = Number(m[2].replace(/\./g, ''))
  return { name: m[1].trim(), altitudeM: Number.isFinite(alt) ? alt : undefined }
}

/** Validate an upstream camera URL: https, allow-listed host, .gif path. Returns the URL without the cache-buster. */
export function safeCameraUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' || u.hostname !== WEBCAM_IMAGE_HOST || !/^\/prod\/[\w.-]+\.gif$/i.test(u.pathname)) return undefined
    return `${u.origin}${u.pathname}`
  } catch {
    return undefined
  }
}

export function normalizeCameras(raw: MobilitatEnvelope<RawCamera>, source = 'mobilitat-cameras'): GeoEntity<WebcamProps>[] {
  const out: GeoEntity<WebcamProps>[] = []
  for (const c of raw.result ?? []) {
    const lat = coord(c.lat)
    const lon = coord(c.lng)
    const upstreamUrl = safeCameraUrl(c.url_gif)
    if (typeof c?.id !== 'number' || lat === undefined || lon === undefined || !upstreamUrl || !inBBox(lon, lat, MOBILITAT_BBOX)) continue
    const { name, altitudeM } = splitCameraTitle(decodeEntities(c.title ?? `Càmera ${c.id}`))
    out.push({
      id: `${source}:${c.id}`,
      type: 'webcam',
      label: name,
      position: { latitude: lat, longitude: lon, altitude: altitudeM },
      source,
      properties: { cameraId: c.id, altitudeM, zone: c.category_id ? CAMERA_ZONES[c.category_id] : undefined, upstreamUrl },
    })
  }
  return out
}

// ------------------------------------------------------------------ points (parkings, EV chargers)

export interface RawPoint {
  id: number
  category_id?: number
  title?: string
  text?: string
  lat?: string | number
  lng?: string | number
}

export const POINT_CATEGORY = { hospital: 1, primaryCare: 4, evCharger: 5, parking: 7, bikes: 8 } as const

export interface ParkingProps extends Record<string, unknown> {
  /** Static capacity as published (cars). */
  capacity?: number
  /** Free text capacity as published (e.g. "40 places + 10 autocaravanes"). */
  capacityText?: string
  /** Live free spaces — only when a live source provides them. */
  free?: number
  /** Live total counted spaces. */
  total?: number
  /** 0–100, live only. */
  occupancyPct?: number
  live: boolean
  pricePerHour?: number
  operator?: string
  parish?: string
  /** Which feed produced this entity. */
  origin: 'alv-live' | 'mobilitat'
}

export interface EvChargerProps extends Record<string, unknown> {
  /** Number of charging points at the site, as published. */
  points?: number
  address: string
}

export function parseCapacity(text: string): number | undefined {
  // "40 places", "15 places + 10 autocaravanes", "10 places d'autocaravanas i 50 places de cotxes"
  const cars = text.match(/(\d+)\s*places\s*de\s*cotxes/i) ?? text.match(/(\d+)\s*places/i)
  return cars ? Number(cars[1]) : undefined
}

export function normalizePoints(raw: MobilitatEnvelope<RawPoint>, source = 'mobilitat-points') {
  const parkings: GeoEntity<ParkingProps>[] = []
  const chargers: GeoEntity<EvChargerProps>[] = []
  for (const p of raw.result ?? []) {
    const lat = coord(p.lat)
    const lon = coord(p.lng)
    if (typeof p?.id !== 'number' || lat === undefined || lon === undefined || !inBBox(lon, lat, MOBILITAT_BBOX)) continue
    const title = stripHtml(p.title)
    const text = stripHtml(p.text)
    if (p.category_id === POINT_CATEGORY.parking) {
      parkings.push({
        id: `${source}:parking:${p.id}`,
        type: 'parking',
        label: title || 'Aparcament',
        position: { latitude: lat, longitude: lon },
        source,
        properties: { capacity: parseCapacity(text), capacityText: text || undefined, live: false, origin: 'mobilitat' },
      })
    } else if (p.category_id === POINT_CATEGORY.evCharger) {
      const n = text.match(/(\d+)/)
      chargers.push({
        id: `${source}:ev:${p.id}`,
        type: 'evCharger',
        label: title.replace(/,?\s*Andorra$/i, '') || 'Punt de recàrrega',
        position: { latitude: lat, longitude: lon },
        source,
        properties: { points: n ? Number(n[1]) : undefined, address: title },
      })
    }
    // Hospital / primary care / bike points are covered elsewhere (OSM) or out of scope.
  }
  return { parkings, chargers }
}
