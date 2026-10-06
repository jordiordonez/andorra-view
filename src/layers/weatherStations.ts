import { Cartesian3, Color, ConstantPositionProperty, ConstantProperty } from 'cesium'
import { fetchFeed } from '../core/api'
import { fmt, type EntityDetails } from '../core/details'
import { Layer } from '../core/layer'
import { formatLocalTime } from '../core/time'
import type { GeoEntity } from '../core/types'
import { badgeIcon } from '../map/icons'
import type { WeatherStationProps } from '../providers/meteoAd'
import { groundBillboard, groundLabel } from './common'
import { syncEntities } from './sync'

/** Temperature colour ramp (°C). */
export function temperatureColor(t: number | undefined): string {
  if (t === undefined) return '#94a3b8'
  if (t <= -10) return '#a78bfa'
  if (t <= 0) return '#60a5fa'
  if (t <= 8) return '#67e8f9'
  if (t <= 16) return '#86efac'
  if (t <= 24) return '#fde047'
  if (t <= 30) return '#fb923c'
  return '#ef4444'
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
const compass = (deg?: number) => (deg === undefined ? '' : COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8])

function stationLabel(e: GeoEntity<WeatherStationProps>) {
  const t = e.properties.temperatureC
  return t !== undefined ? `${t.toLocaleString('ca-AD', { maximumFractionDigits: 1 })}°` : e.label
}

export class WeatherStationsLayer extends Layer {
  constructor() {
    super({
      id: 'weather-stations',
      title: 'Estacions meteorològiques',
      group: 'weather',
      sources: ['meteo-ad'],
      defaultEnabled: true,
      refreshMs: 5 * 60_000,
      description: 'Observacions de les estacions automàtiques del SMN',
    })
  }

  protected load() {
    return fetchFeed('weather-stations')
  }

  protected render(items: GeoEntity[]) {
    syncEntities(
      this.dataSource,
      items as GeoEntity<WeatherStationProps>[],
      (e) => ({
        position: Cartesian3.fromDegrees(e.position.longitude, e.position.latitude),
        billboard: groundBillboard(badgeIcon('thermo', temperatureColor(e.properties.temperatureC), { size: 26 }), { scale: 0.7 }),
        label: {
          ...groundLabel(stationLabel(e), { maxDistance: 70_000, color: temperatureColor(e.properties.temperatureC) }),
          font: '700 13px Inter, system-ui, sans-serif',
        },
      }),
      (entity, e) => {
        const color = temperatureColor(e.properties.temperatureC)
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(e.position.longitude, e.position.latitude))
        entity.billboard!.image = new ConstantProperty(badgeIcon('thermo', color, { size: 26 }))
        entity.label!.text = new ConstantProperty(stationLabel(e))
        entity.label!.fillColor = new ConstantProperty(Color.fromCssColorString(color))
      },
    )
  }

  describe(e: GeoEntity): EntityDetails {
    const p = (e as GeoEntity<WeatherStationProps>).properties
    const fields: EntityDetails['fields'] = [
      { label: 'Temperatura', value: fmt.num(p.temperatureC, 1, '°C') },
      { label: 'Humitat', value: fmt.num(p.humidityPct, 0, '%') },
      {
        label: 'Vent',
        value: p.windSpeedMs !== undefined ? `${fmt.num(p.windSpeedMs * 3.6, 0, 'km/h')} ${compass(p.windDirDeg)} (${fmt.num(p.windDirDeg, 0, '°')})` : '—',
      },
      { label: 'Precipitació 24 h', value: fmt.num(p.precip24hMm, 1, 'mm') },
      ...(p.snowDepthCm !== undefined ? [{ label: 'Gruix de neu', value: fmt.num(p.snowDepthCm, 0, 'cm') }] : []),
      ...(p.pressureMslHPa !== undefined ? [{ label: 'Pressió (nivell del mar)', value: fmt.num(p.pressureMslHPa, 0, 'hPa') }] : []),
      { label: 'Altitud', value: fmt.num(p.altitudeM, 0, 'm') },
      { label: 'Observació', value: formatLocalTime(e.timestamp) },
    ]
    return {
      title: e.label,
      subtitle: 'Estació meteorològica · SMN Andorra',
      badges: ['OBSERVACIÓ'],
      fields,
      links: [{ label: 'Fitxa a meteo.ad', url: `https://www.meteo.ad/estacions/${p.code}` }],
    }
  }

  searchText(e: GeoEntity) {
    return `${e.label} meteo estació temps temperatura`
  }
}
