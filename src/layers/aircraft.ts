import { CallbackPositionProperty, Cartesian2, Cartesian3, Color, ConstantProperty, DistanceDisplayCondition, LabelStyle, Math as CMath, NearFarScalar, ReferenceFrame, VerticalOrigin } from 'cesium'
import { fetchFeed } from '../core/api'
import { fmt, type EntityDetails } from '../core/details'
import { Layer } from '../core/layer'
import type { GeoEntity } from '../core/types'
import { glyphIcon, PALETTE } from '../map/icons'
import type { AircraftProps } from '../providers/aircraft'
import { syncEntities } from './sync'

const MAX_EXTRAPOLATION_S = 20
const R = 6_371_000

/** Dead-reckon a position from the last fix (great-circle, constant speed/heading). */
export function extrapolate(lat: number, lon: number, headingDeg: number, speedMs: number, seconds: number) {
  const d = (speedMs * Math.min(Math.max(seconds, 0), MAX_EXTRAPOLATION_S)) / R
  const h = CMath.toRadians(headingDeg)
  const φ1 = CMath.toRadians(lat)
  const λ1 = CMath.toRadians(lon)
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(h))
  const λ2 = λ1 + Math.atan2(Math.sin(h) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2))
  return { lat: CMath.toDegrees(φ2), lon: CMath.toDegrees(λ2) }
}

export class AircraftLayer extends Layer {
  constructor() {
    super({
      id: 'aircraft',
      title: 'Avions',
      group: 'sky',
      sources: ['adsb-lol', 'opensky'],
      defaultEnabled: true,
      refreshMs: 10_000,
      description: 'Trànsit aeri ADS-B a ~110 km d’Andorra',
    })
  }

  protected load() {
    return fetchFeed('aircraft')
  }

  protected render(items: GeoEntity[]) {
    syncEntities(
      this.dataSource,
      items as GeoEntity<AircraftProps>[],
      (a) => {
        const fix = { entity: a, receivedAt: Date.now() }
        return {
          position: new CallbackPositionProperty(() => this.positionOf(fix.entity, fix.receivedAt), false, ReferenceFrame.FIXED),
          billboard: {
            image: glyphIcon('plane', a.properties.onGround ? PALETTE.muted : PALETTE.aircraft),
            rotation: CMath.toRadians(-(a.properties.headingDeg ?? 0)),
            alignedAxis: Cartesian3.UNIT_Z,
            scale: 0.9,
            scaleByDistance: new NearFarScalar(5_000, 1.2, 400_000, 0.5),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: a.label,
            font: '600 11px Inter, system-ui, sans-serif',
            fillColor: Color.fromCssColorString(PALETTE.aircraft),
            outlineColor: Color.fromCssColorString('#05070a'),
            outlineWidth: 3,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -16),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 250_000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          properties: { fix },
        }
      },
      (entity, a) => {
        const fix = entity.properties?.fix?.getValue() as { entity: GeoEntity<AircraftProps>; receivedAt: number }
        fix.entity = a
        fix.receivedAt = Date.now()
        entity.billboard!.rotation = new ConstantProperty(CMath.toRadians(-(a.properties.headingDeg ?? 0)))
        entity.label!.text = new ConstantProperty(a.label)
      },
    )
  }

  private positionOf(a: GeoEntity<AircraftProps>, receivedAt: number): Cartesian3 {
    const { latitude, longitude, altitude = 0 } = a.position
    const p = a.properties
    if (p.onGround || p.speedKmh === undefined || p.headingDeg === undefined) return Cartesian3.fromDegrees(longitude, latitude, altitude)
    const age = (Date.now() - receivedAt) / 1000 + (p.positionAgeS ?? 0)
    const { lat, lon } = extrapolate(latitude, longitude, p.headingDeg, p.speedKmh / 3.6, age)
    return Cartesian3.fromDegrees(lon, lat, altitude + (p.verticalRateMs ?? 0) * Math.min(age, MAX_EXTRAPOLATION_S))
  }

  tick() {
    if (this.entities.length) this.viewer.scene.requestRender()
  }

  describe(e: GeoEntity): EntityDetails {
    const p = (e as GeoEntity<AircraftProps>).properties
    return {
      title: p.callsign ?? p.icao24.toUpperCase(),
      subtitle: p.aircraftType ? `Tipus ${p.aircraftType}` : 'Aeronau',
      fields: [
        { label: 'Altitud', value: p.onGround ? 'A terra' : fmt.num(p.altitudeM, 0, 'm') },
        { label: 'Velocitat', value: fmt.num(p.speedKmh, 0, 'km/h') },
        { label: 'Rumb', value: fmt.num(p.headingDeg, 0, '°') },
        { label: 'Velocitat vertical', value: fmt.num(p.verticalRateMs, 1, 'm/s') },
        { label: 'Squawk', value: fmt.text(p.squawk), tone: ['7500', '7600', '7700'].includes(p.squawk ?? '') ? 'bad' : undefined },
        { label: 'ICAO 24', value: p.icao24.toUpperCase() },
      ],
      note: 'Posició entre actualitzacions estimada (rumb i velocitat, màx. 20 s). Origen/destí no disponibles a la font oberta.',
    }
  }

  searchText(e: GeoEntity) {
    const p = (e as GeoEntity<AircraftProps>).properties
    return [e.label, p.icao24, p.aircraftType].filter(Boolean).join(' ')
  }
}
