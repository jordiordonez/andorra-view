import { Cartesian3, ConstantPositionProperty, ConstantProperty } from 'cesium'
import { apiUrl, fetchFeed } from '../core/api'
import { fmt, type EntityDetails } from '../core/details'
import { Layer } from '../core/layer'
import type { GeoEntity } from '../core/types'
import { badgeIcon, PALETTE } from '../map/icons'
import type { WebcamProps } from '../providers/mobilitat'
import { groundBillboard, groundLabel } from './common'
import { syncEntities } from './sync'

export class WebcamsLayer extends Layer {
  constructor() {
    super({
      id: 'webcams',
      title: 'Càmeres de trànsit',
      group: 'mobility',
      sources: ['mobilitat-cameras'],
      defaultEnabled: true,
      refreshMs: 5 * 60_000,
      description: '69 càmeres de Mobilitat, incloses les fronteres',
    })
  }

  protected load() {
    return fetchFeed('webcams')
  }

  protected render(items: GeoEntity[]) {
    const icon = badgeIcon('camera', PALETTE.webcam, { size: 28 })
    syncEntities(
      this.dataSource,
      items as GeoEntity<WebcamProps>[],
      (e) => ({
        position: Cartesian3.fromDegrees(e.position.longitude, e.position.latitude),
        billboard: groundBillboard(icon, { scale: 0.75, maxDistance: 60_000 }),
        label: groundLabel(e.label, { maxDistance: 1_500 }),
      }),
      (entity, e) => {
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(e.position.longitude, e.position.latitude))
        entity.label!.text = new ConstantProperty(e.label)
      },
    )
  }

  describe(e: GeoEntity): EntityDetails {
    const p = (e as GeoEntity<WebcamProps>).properties
    return {
      title: e.label,
      subtitle: 'Càmera de trànsit',
      fields: [
        { label: 'Altitud', value: fmt.num(p.altitudeM, 0, 'm') },
        ...(p.zone ? [{ label: 'Grup (Mobilitat)', value: p.zone }] : []),
      ],
      image: {
        url: apiUrl(`binary/webcam-image/${p.cameraId}`),
        alt: `Imatge de la càmera ${e.label}`,
        caption: 'Timelapse GIF animat (últims minuts)',
        refreshMs: 120_000,
      },
      links: [{ label: 'mobilitat.ad', url: 'https://www.mobilitat.ad' }],
    }
  }

  searchText(e: GeoEntity) {
    const p = (e as GeoEntity<WebcamProps>).properties
    return `${e.label} càmera webcam ${p.zone ?? ''}`
  }
}
