import { AIRSPACE_BBOX, ANDORRA_CENTER, RADII_KM } from '../../src/config/geo'
import type { FeedResponse } from '../../src/core/types'
import { normalizeAdsbLol, normalizeOpenSky, type AdsbLolResponse, type OpenSkyResponse } from '../../src/providers/aircraft'
import { fetchJson } from '../http'
import type { JsonFeed } from './types'

const NM = 1.852

async function openSkyToken(env: { OPENSKY_CLIENT_ID?: string; OPENSKY_CLIENT_SECRET?: string }): Promise<string | undefined> {
  if (!env.OPENSKY_CLIENT_ID || !env.OPENSKY_CLIENT_SECRET) return undefined
  const res = await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.OPENSKY_CLIENT_ID, client_secret: env.OPENSKY_CLIENT_SECRET }),
  })
  if (!res.ok) return undefined
  return ((await res.json()) as { access_token?: string }).access_token
}

type Attempt = () => Promise<FeedResponse>

/**
 * Aircraft around Andorra: adsb.lol (ODbL) → OpenSky.
 * Note (2026-10-06): from Cloudflare Workers egress, adsb.lol answers 429, OpenSky times out and adsb.fi answers 403
 * (cloud IPs refused). adsb.fi was removed for that reason; see README "Known limitations".
 */
export const aircraftFeed: JsonFeed = {
  kind: 'json',
  id: 'aircraft',
  sourceId: 'adsb-lol',
  ttlSeconds: 8,
  staleSeconds: 60,
  async load({ env }): Promise<FeedResponse> {
    const fetchedAt = new Date().toISOString()
    const nm = Math.round(RADII_KM.airspace / NM)
    const { latitude: lat, longitude: lon } = ANDORRA_CENTER
    const readsb = (source: 'adsb-lol', url: string): Attempt => async () => {
      const raw = await fetchJson<AdsbLolResponse>(env, url, { timeoutMs: 6000, retries: 0 })
      return { source, fetchedAt, sourceUpdatedAt: new Date(raw.now).toISOString(), entities: normalizeAdsbLol(raw, AIRSPACE_BBOX, source) }
    }
    const attempts: Array<[string, Attempt]> = [
      ['adsb.lol', readsb('adsb-lol', `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${nm}`)],
      [
        'OpenSky',
        async () => {
          const b = AIRSPACE_BBOX
          const token = await openSkyToken(env).catch(() => undefined)
          const raw = await fetchJson<OpenSkyResponse>(
            env,
            `https://opensky-network.org/api/states/all?lamin=${b.south}&lomin=${b.west}&lamax=${b.north}&lomax=${b.east}`,
            { timeoutMs: 8000, retries: 0, headers: token ? { Authorization: `Bearer ${token}` } : {} },
          )
          return { source: 'opensky', fetchedAt, sourceUpdatedAt: new Date(raw.time * 1000).toISOString(), entities: normalizeOpenSky(raw, AIRSPACE_BBOX) }
        },
      ],
    ]
    const failures: string[] = []
    for (const [name, attempt] of attempts) {
      try {
        const res = await attempt()
        if (failures.length) res.warning = `Font principal no disponible (${failures.join('; ')}); dades de ${name}`
        return res
      } catch (err) {
        failures.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    throw new Error(failures.join('; '))
  },
}
