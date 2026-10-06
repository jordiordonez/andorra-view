import { Cartesian3, ConstantPositionProperty, ConstantProperty } from 'cesium'
import { fetchFeed } from '../core/api'
import { fmt, type EntityDetails } from '../core/details'
import { Layer } from '../core/layer'
import { formatLocalTime } from '../core/time'
import type { GeoEntity } from '../core/types'
import { badgeIcon, PALETTE, type GlyphName } from '../map/icons'
import type { IncidentKind, IncidentProps } from '../providers/mobilitat'
import { groundBillboard, groundLabel } from './common'
import { syncEntities } from './sync'

const GLYPH: Record<IncidentKind, GlyphName> = {
  works: 'works',
  closure: 'closed',
  snow: 'snow',
  accident: 'warning',
  weather: 'warning',
  restriction: 'closed',
  info: 'warning',
  other: 'warning',
}

export function incidentColor(p: IncidentProps): string {
  if (p.kind === 'closure' || p.severity === 'VERMELL') return PALETTE.closure
  if (p.kind === 'works') return PALETTE.works
  if (p.severity === 'BLAU' || p.kind === 'info') return PALETTE.info
  return PALETTE.incident
}

const KIND_LABEL: Record<IncidentKind, string> = {
  works: 'Obres',
  closure: 'Tall de carretera',
  snow: 'Neu',
  accident: 'Accident',
  weather: 'Meteorologia',
  restriction: 'Restricció',
  info: 'Informació',
  other: 'Incidència',
}

export class TrafficIncidentsLayer extends Layer {
  /** Incidents without coordinates (listed in the layer panel / detail). */
  withoutLocation: Array<{ id: number; title: string; category?: string }> = []

  constructor() {
    super({
      id: 'traffic-incidents',
      title: 'Incidències de trànsit',
      group: 'mobility',
      sources: ['mobilitat-incidents'],
      defaultEnabled: true,
      refreshMs: 90_000,
      description: 'Obres, talls i incidències (Mobilitat)',
    })
  }

  protected async load() {
    const data = await fetchFeed('traffic-incidents')
    this.withoutLocation = (data.meta?.withoutLocation as typeof this.withoutLocation | undefined) ?? []
    return data
  }

  protected render(items: GeoEntity[]) {
    syncEntities(
      this.dataSource,
      items as GeoEntity<IncidentProps>[],
      (e) => ({
        position: Cartesian3.fromDegrees(e.position.longitude, e.position.latitude),
        billboard: groundBillboard(badgeIcon(GLYPH[e.properties.kind], incidentColor(e.properties)), { scale: e.properties.important ? 0.95 : 0.8 }),
        label: groundLabel(e.label.length > 42 ? `${e.label.slice(0, 40)}…` : e.label, { maxDistance: 3_000 }),
      }),
      (entity, e) => {
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(e.position.longitude, e.position.latitude))
        entity.billboard!.image = new ConstantProperty(badgeIcon(GLYPH[e.properties.kind], incidentColor(e.properties)))
        entity.label!.text = new ConstantProperty(e.label.length > 42 ? `${e.label.slice(0, 40)}…` : e.label)
      },
    )
  }

  describe(e: GeoEntity): EntityDetails {
    const p = (e as GeoEntity<IncidentProps>).properties
    return {
      title: e.label,
      subtitle: [KIND_LABEL[p.kind], p.category && p.category !== KIND_LABEL[p.kind] ? p.category : undefined].filter(Boolean).join(' · '),
      badges: p.important ? ['IMPORTANT'] : undefined,
      fields: [
        { label: 'Inici', value: formatLocalTime(p.start) },
        { label: 'Fi prevista', value: p.end ? formatLocalTime(p.end) : 'Sense data de fi' },
        { label: 'Tipus', value: e.type === 'roadClosure' ? 'Tall / tancament' : fmt.text(p.category), tone: e.type === 'roadClosure' ? 'bad' : undefined },
        ...(p.description ? [{ label: 'Detall', value: p.description }] : []),
      ],
      links: [
        ...(p.imageUrl ? [{ label: 'Imatge (mobilitat.ad)', url: p.imageUrl }] : []),
        { label: 'mobilitat.ad', url: 'https://www.mobilitat.ad' },
      ],
    }
  }

  searchText(e: GeoEntity) {
    const p = (e as GeoEntity<IncidentProps>).properties
    return `${e.label} ${p.category ?? ''} ${KIND_LABEL[p.kind]} ${p.description ?? ''}`
  }
}

