import type { FeedResponse } from '../../src/core/types'
import {
  normalizeCameras,
  normalizeIncidents,
  normalizePoints,
  type MobilitatEnvelope,
  type RawCamera,
  type RawIncident,
  type RawPoint,
} from '../../src/providers/mobilitat'
import type { Env } from '../env'
import { fetchJson, fetchUpstream, UpstreamError } from '../http'
import type { BinaryFeed, JsonFeed } from './types'

const API = 'https://app.mobilitat.ad/api/v1'

/** Road incidents, works and closures (Mobilitat Andorra). */
export const trafficIncidentsFeed: JsonFeed = {
  kind: 'json',
  id: 'traffic-incidents',
  sourceId: 'mobilitat-incidents',
  ttlSeconds: 90,
  staleSeconds: 3600,
  async load({ env }): Promise<FeedResponse> {
    const fetchedAt = new Date().toISOString()
    const raw = await fetchJson<MobilitatEnvelope<RawIncident>>(env, `${API}/incidents/ca`, { timeoutMs: 8000 })
    if (raw.success === false) throw new UpstreamError('Mobilitat incidents: success=false')
    const { entities, withoutLocation } = normalizeIncidents(raw)
    return {
      source: 'mobilitat-incidents',
      fetchedAt,
      entities,
      meta: { withoutLocation, withoutLocationCount: withoutLocation.length },
    }
  },
}

// Per-isolate memo of the camera list, used to allow-list webcam image requests.
let cameraMemo: { at: number; urls: Map<string, string> } | undefined
const CAMERA_MEMO_MS = 10 * 60_000

async function loadCameras(env: Env) {
  const raw = await fetchJson<MobilitatEnvelope<RawCamera>>(env, `${API}/cameras`, { timeoutMs: 8000 })
  if (raw.success === false) throw new UpstreamError('Mobilitat cameras: success=false')
  const entities = normalizeCameras(raw)
  cameraMemo = { at: Date.now(), urls: new Map(entities.map((e) => [String(e.properties.cameraId), e.properties.upstreamUrl])) }
  return entities
}

/** Road webcams (Mobilitat Andorra). Images are served by `webcamImageFeed`. */
export const webcamsFeed: JsonFeed = {
  kind: 'json',
  id: 'webcams',
  sourceId: 'mobilitat-cameras',
  ttlSeconds: 300,
  staleSeconds: 6 * 3600,
  async load({ env }): Promise<FeedResponse> {
    const fetchedAt = new Date().toISOString()
    return { source: 'mobilitat-cameras', fetchedAt, entities: await loadCameras(env) }
  },
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024

/**
 * Latest animated GIF for one camera: /api/binary/webcam-image/<cameraId>.
 * Only camera ids from the official list are accepted, and only imgs.mobilitat.ad URLs are fetched.
 */
export const webcamImageFeed: BinaryFeed = {
  kind: 'binary',
  id: 'webcam-image',
  sourceId: 'mobilitat-cameras',
  ttlSeconds: 120,
  staleSeconds: 1800,
  async load({ env }, key) {
    if (!/^\d{1,6}$/.test(key)) throw new UpstreamError('invalid camera id', 400)
    if (!cameraMemo || Date.now() - cameraMemo.at > CAMERA_MEMO_MS || !cameraMemo.urls.has(key)) await loadCameras(env)
    const url = cameraMemo?.urls.get(key)
    if (!url) throw new UpstreamError('unknown camera id', 404)
    const res = await fetchUpstream(env, `${url}?t=${Math.floor(Date.now() / 60_000)}`, { timeoutMs: 15_000, retries: 0, headers: { Accept: 'image/gif,image/*' } })
    const type = res.headers.get('Content-Type') ?? ''
    if (!type.startsWith('image/')) throw new UpstreamError(`unexpected content type ${type}`)
    const declared = Number(res.headers.get('Content-Length') ?? 0)
    if (declared > MAX_IMAGE_BYTES) throw new UpstreamError('image too large')
    const body = await res.arrayBuffer()
    if (body.byteLength > MAX_IMAGE_BYTES) throw new UpstreamError('image too large')
    return { body, contentType: type }
  },
}

/** Car parks (static capacity) and EV charging sites published by Mobilitat. */
export const mobilityPointsFeed: JsonFeed = {
  kind: 'json',
  id: 'mobility-points',
  sourceId: 'mobilitat-points',
  ttlSeconds: 3600,
  staleSeconds: 7 * 24 * 3600,
  async load({ env }): Promise<FeedResponse> {
    const fetchedAt = new Date().toISOString()
    const raw = await fetchJson<MobilitatEnvelope<RawPoint>>(env, `${API}/points/ca`, { timeoutMs: 8000 })
    if (raw.success === false) throw new UpstreamError('Mobilitat points: success=false')
    const { parkings, chargers } = normalizePoints(raw)
    return { source: 'mobilitat-points', fetchedAt, entities: [...parkings, ...chargers] }
  },
}
