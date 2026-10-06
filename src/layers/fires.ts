import { Cartesian3, Color, HeightReference, NearFarScalar } from 'cesium'
import { fetchFeed } from '../core/api'
import { fmt, type EntityDetails } from '../core/details'
import { Layer } from '../core/layer'
import { formatLocalTime, timeAgo } from '../core/time'
import type { GeoEntity } from '../core/types'
import type { FireProps } from '../providers/fires'
import { syncEntities } from './sync'

/** Older hotspots fade from red to amber. */
export function fireColor(acquiredAt: string, now = Date.now()): Color {
  const hours = (now - Date.parse(acquiredAt)) / 3_600_000
  return hours < 6 ? Color.fromCssColorString('#ef4444') : hours < 12 ? Color.fromCssColorString('#f97316') : Color.fromCssColorString('#f59e0b').withAlpha(0.8)
}

export class FiresLayer extends Layer {
  constructor() {
    super({
      id: 'fires',
      title: 'Focus de calor',
      group: 'emergency',
      sources: ['nasa-firms'],
      defaultEnabled: true,
      refreshMs: 15 * 60_000,
      description: 'Anomalies tèrmiques VIIRS (24 h) a 150 km',
    })
  }

  protected load() {
    return fetchFeed('fires')
  }

  protected render(items: GeoEntity[]) {
    syncEntities(this.dataSource, items as GeoEntity<FireProps>[], (f) => {
      const color = fireColor(f.properties.acquiredAt)
      return {
        position: Cartesian3.fromDegrees(f.position.longitude, f.position.latitude),
        point: {
          pixelSize: Math.min(18, 7 + Math.sqrt(f.properties.frpMw ?? 1) * 1.5),
          color,
          outlineColor: Color.fromCssColorString('#fde68a').withAlpha(0.9),
          outlineWidth: 1.5,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new NearFarScalar(5_000, 1.2, 400_000, 0.6),
        },
      }
    })
  }

  describe(e: GeoEntity): EntityDetails {
    const p = (e as GeoEntity<FireProps>).properties
    return {
      title: 'Punt calent detectat per satèl·lit',
      subtitle: `${p.satellite} · ${p.instrument}`,
      fields: [
        { label: 'Detecció', value: `${formatLocalTime(p.acquiredAt)} (${timeAgo(p.acquiredAt)})` },
        { label: 'Distància a Andorra', value: fmt.num(p.distanceKm, 0, 'km') },
        { label: 'Potència radiativa (FRP)', value: fmt.num(p.frpMw, 1, 'MW') },
        { label: 'Confiança', value: fmt.text(p.confidence), tone: p.confidence === 'high' ? 'bad' : undefined },
        { label: 'Temperatura de brillantor', value: fmt.num(p.brightnessK, 0, 'K') },
        { label: 'Passada', value: p.dayNight === 'day' ? 'Diürna' : p.dayNight === 'night' ? 'Nocturna' : '—' },
        { label: 'Coordenades', value: `${e.position.latitude.toFixed(4)}, ${e.position.longitude.toFixed(4)}` },
      ],
      note: 'Anomalia tèrmica detectada des de l’espai (píxel ~375 m). Pot ser un incendi, una crema agrícola o una font industrial: no està confirmat com a incendi forestal.',
      links: [{ label: 'NASA FIRMS', url: `https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@${e.position.longitude.toFixed(3)},${e.position.latitude.toFixed(3)},11z` }],
    }
  }

  searchText(e: GeoEntity) {
    return `${e.label} incendi foc fire`
  }
}
