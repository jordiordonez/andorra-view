import { Cartesian2, Cartesian3, Color, ConstantPositionProperty, DistanceDisplayCondition, LabelStyle, NearFarScalar, VerticalOrigin, type Entity } from 'cesium'
import type { SatRec } from 'satellite.js'
import { ANDORRA_CENTER } from '../config/geo'
import { fetchFeed } from '../core/api'
import { fmt, type EntityDetails } from '../core/details'
import { Layer } from '../core/layer'
import { formatLocalTime } from '../core/time'
import type { GeoEntity } from '../core/types'
import { glyphIcon, PALETTE } from '../map/icons'
import { ALWAYS_SHOWN, computeSatState, satrecFromOmm, type SatelliteProps, type SatState } from '../providers/satellites'
import { syncEntities } from './sync'

/** Minimum elevation above the Andorran horizon for a satellite to be drawn. */
export const MIN_ELEVATION_DEG = 10

interface Tracked {
  satrec: SatRec
  entity: Entity
  state?: SatState
}

export class SatellitesLayer extends Layer {
  private tracked = new Map<string, Tracked>()

  constructor() {
    super({
      id: 'satellites',
      title: 'Satèl·lits',
      group: 'sky',
      sources: ['celestrak'],
      defaultEnabled: false,
      refreshMs: 2 * 3600_000,
      description: `Estacions espacials i satèl·lits brillants per sobre de ${MIN_ELEVATION_DEG}° a Andorra`,
    })
  }

  protected load() {
    return fetchFeed('satellites')
  }

  protected render(items: GeoEntity[]) {
    const sats = items as GeoEntity<SatelliteProps>[]
    syncEntities(this.dataSource, sats, (s) => ({
      position: new ConstantPositionProperty(Cartesian3.fromDegrees(s.position.longitude, s.position.latitude, s.position.altitude ?? 0)),
      show: false,
      billboard: {
        image: glyphIcon('satellite', ALWAYS_SHOWN.has(s.properties.noradId) ? '#fde68a' : PALETTE.satellite, 26),
        scale: 0.9,
        scaleByDistance: new NearFarScalar(200_000, 1.1, 8_000_000, 0.6),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: s.label,
        font: '600 11px Inter, system-ui, sans-serif',
        fillColor: Color.fromCssColorString(PALETTE.satellite),
        outlineColor: Color.fromCssColorString('#05070a'),
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -16),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 6_000_000),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    }))
    this.tracked.clear()
    for (const s of sats) {
      const satrec = satrecFromOmm(s.properties.omm)
      const entity = this.dataSource.entities.getById(s.id)
      if (satrec && entity) this.tracked.set(s.id, { satrec, entity })
    }
    this.tick(new Date())
  }

  /** Re-propagate every second (SGP4) and show only what is above the Andorran horizon. */
  tick(now: Date) {
    let visible = 0
    for (const [id, t] of this.tracked) {
      const state = computeSatState(t.satrec, now, ANDORRA_CENTER)
      t.state = state
      const noradId = Number(id.split(':')[1])
      const show = !!state && (state.elevationDeg >= MIN_ELEVATION_DEG || ALWAYS_SHOWN.has(noradId))
      t.entity.show = show
      if (show && state) {
        ;(t.entity.position as ConstantPositionProperty).setValue(Cartesian3.fromDegrees(state.longitude, state.latitude, state.altitudeKm * 1000))
        visible++
      }
    }
    if (this.tracked.size) this.viewer?.scene.requestRender()
    this.visibleCount = visible
  }

  visibleCount = 0

  /** Currently drawn satellites (above the horizon threshold or always-shown). */
  visibleEntities(): GeoEntity[] {
    return this.entities.filter((e) => this.tracked.get(e.id)?.entity.show)
  }

  describe(e: GeoEntity): EntityDetails {
    const p = (e as GeoEntity<SatelliteProps>).properties
    const state = this.tracked.get(e.id)?.state
    const above = state && state.elevationDeg > 0
    return {
      title: p.name,
      subtitle: `NORAD ${p.noradId}${p.objectId ? ` · ${p.objectId}` : ''}`,
      badges: ['CALCULAT'],
      fields: [
        { label: 'Altitud', value: fmt.num(state?.altitudeKm, 0, 'km') },
        { label: 'Elevació des d’Andorra', value: fmt.num(state?.elevationDeg, 1, '°'), tone: above ? 'good' : undefined },
        { label: 'Azimut', value: fmt.num(state?.azimuthDeg, 0, '°') },
        { label: 'Distància', value: fmt.num(state?.rangeKm, 0, 'km') },
        { label: 'Velocitat', value: fmt.num(state?.speedKms, 2, 'km/s') },
        { label: 'Grups CelesTrak', value: p.groups.join(', ') },
      ],
      note: `Posició calculada (SGP4) a partir d’elements orbitals de ${formatLocalTime(p.epoch)}; no és una observació directa.`,
      links: [{ label: 'CelesTrak', url: `https://celestrak.org/satcat/table-satcat.php?CATNR=${p.noradId}` }],
    }
  }

  searchText(e: GeoEntity) {
    const p = (e as GeoEntity<SatelliteProps>).properties
    return `${e.label} ${p.noradId} ${p.objectId ?? ''} satèl·lit`
  }
}
