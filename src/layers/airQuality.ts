import { Cartesian3, ConstantPositionProperty, ConstantProperty } from 'cesium'
import { fetchFeed } from '../core/api'
import { fmt, type EntityDetails } from '../core/details'
import { Layer } from '../core/layer'
import { formatLocalTime } from '../core/time'
import type { GeoEntity } from '../core/types'
import { badgeIcon, PALETTE } from '../map/icons'
import type { AirQualityProps } from '../providers/aireAd'
import { groundBillboard, groundLabel } from './common'
import { syncEntities } from './sync'

const colorOf = (p: AirQualityProps) => p.color ?? PALETTE.air

export class AirQualityLayer extends Layer {
  constructor() {
    super({
      id: 'air-quality',
      title: 'Qualitat de l’aire',
      group: 'environment',
      sources: ['aire-ad'],
      refreshMs: 30 * 60_000,
      description: 'Índex i contaminants de la xarxa de vigilància',
    })
  }

  protected load() {
    return fetchFeed('air-quality')
  }

  protected render(items: GeoEntity[]) {
    syncEntities(
      this.dataSource,
      items as GeoEntity<AirQualityProps>[],
      (e) => ({
        position: Cartesian3.fromDegrees(e.position.longitude, e.position.latitude),
        billboard: groundBillboard(badgeIcon('air', colorOf(e.properties), { size: 28 }), { scale: 0.8 }),
        label: groundLabel(e.properties.band ? `${e.label} · ${e.properties.band}` : e.label, { maxDistance: 25_000 }),
      }),
      (entity, e) => {
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(e.position.longitude, e.position.latitude))
        entity.billboard!.image = new ConstantProperty(badgeIcon('air', colorOf(e.properties), { size: 28 }))
        entity.label!.text = new ConstantProperty(e.properties.band ? `${e.label} · ${e.properties.band}` : e.label)
      },
    )
  }

  describe(e: GeoEntity): EntityDetails {
    const p = (e as GeoEntity<AirQualityProps>).properties
    const tone = (band?: string): 'good' | 'warn' | 'bad' | undefined =>
      !band ? undefined : /excel|bona/i.test(band) ? 'good' : /regular|moderad|acceptable/i.test(band) ? 'warn' : 'bad'
    return {
      title: e.label,
      subtitle: ['Qualitat de l’aire', p.stationType].filter(Boolean).join(' · '),
      fields: [
        { label: 'Qualitat', value: fmt.text(p.band), tone: tone(p.band) },
        { label: 'Índex', value: fmt.num(p.index, 2) },
        ...p.pollutants.map((x) => ({ label: `${x.name}${x.period ? ` (${x.period.toLowerCase()})` : ''}`, value: x.concentration, tone: tone(x.band) })),
        ...(p.location ? [{ label: 'Ubicació', value: p.location }] : []),
        { label: 'Hora de la mesura', value: formatLocalTime(e.timestamp) },
      ],
      links: [{ label: 'aire.ad', url: 'https://aire.ad' }],
    }
  }

  searchText(e: GeoEntity) {
    return `${e.label} aire qualitat contaminació`
  }
}
