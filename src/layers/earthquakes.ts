import { Cartesian3, Color, HeightReference, NearFarScalar } from 'cesium'
import { fetchWithTimeout } from '../core/api'
import { fmt, type EntityDetails } from '../core/details'
import { Layer } from '../core/layer'
import { formatLocalTime, timeAgo } from '../core/time'
import type { FeedResponse, GeoEntity } from '../core/types'
import { PALETTE } from '../map/icons'
import { emscQueryUrl, normalizeEmsc, type EarthquakeProps, type EmscResponse } from '../providers/earthquakes'
import { syncEntities } from './sync'

const DAY = 86_400_000

/** Recent events are bright magenta; older ones fade. */
export function quakeColor(time: string, now = Date.now()): Color {
  const age = now - Date.parse(time)
  const base = Color.fromCssColorString(PALETTE.quake)
  return age < DAY ? base : age < 7 * DAY ? base.withAlpha(0.75) : base.withAlpha(0.45)
}

export const quakeSize = (mag: number | undefined) => Math.max(8, Math.min(30, 6 + (mag ?? 1) * 5))

export class EarthquakesLayer extends Layer {
  constructor() {
    super({
      id: 'earthquakes',
      title: 'Terratrèmols',
      group: 'emergency',
      sources: ['emsc'],
      defaultEnabled: true,
      refreshMs: 2 * 60_000,
      description: 'Sismes dels darrers 30 dies a 150 km (EMSC, IGN, ReNaSS)',
    })
  }

  /** Direct browser call: EMSC sends CORS `*`. 204 = no events. */
  protected async load(): Promise<FeedResponse> {
    const res = await fetchWithTimeout(emscQueryUrl(), { timeoutMs: 15_000 })
    const raw = res.status === 204 ? undefined : ((await res.json()) as EmscResponse)
    const entities = normalizeEmsc(raw)
    return {
      source: 'emsc',
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt: entities.map((e) => e.properties.lastUpdate ?? e.properties.time).sort().at(-1),
      entities,
    }
  }

  protected render(items: GeoEntity[]) {
    syncEntities(this.dataSource, items as GeoEntity<EarthquakeProps>[], (q) => ({
      position: Cartesian3.fromDegrees(q.position.longitude, q.position.latitude),
      point: {
        pixelSize: quakeSize(q.properties.magnitude),
        color: quakeColor(q.properties.time).withAlpha(0.35),
        outlineColor: quakeColor(q.properties.time),
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new NearFarScalar(10_000, 1.2, 600_000, 0.7),
      },
    }))
  }

  describe(e: GeoEntity): EntityDetails {
    const p = (e as GeoEntity<EarthquakeProps>).properties
    return {
      title: typeof p.magnitude === 'number' ? `Magnitud ${p.magnitude.toFixed(1)} ${p.magnitudeType ?? ''}`.trim() : 'Sisme',
      subtitle: p.region ?? undefined,
      fields: [
        { label: 'Hora', value: `${formatLocalTime(p.time)} (${timeAgo(p.time)})` },
        { label: 'Profunditat', value: fmt.num(p.depthKm, 1, 'km') },
        { label: 'Distància a Andorra', value: fmt.num(p.distanceKm, 0, 'km') },
        { label: 'Agència', value: fmt.text(p.agency) },
        { label: 'Tipus', value: p.eventType === 'ke' ? 'Terratrèmol' : fmt.text(p.eventType) },
      ],
      links: [{ label: 'Fitxa EMSC', url: p.url }],
      note: p.lastUpdate ? `Solució actualitzada ${timeAgo(p.lastUpdate)}; la magnitud i la posició poden ser revisades.` : undefined,
    }
  }

  searchText(e: GeoEntity) {
    return `${e.label} terratrèmol sisme earthquake`
  }
}
