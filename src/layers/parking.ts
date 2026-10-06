import { Cartesian3, ConstantPositionProperty, ConstantProperty } from 'cesium'
import type { FeatureCollection } from 'geojson'
import { fetchFeed, fetchJsonDirect } from '../core/api'
import { fmt, type EntityDetails } from '../core/details'
import { Layer } from '../core/layer'
import type { FeedResponse, GeoEntity } from '../core/types'
import { badgeIcon, PALETTE } from '../map/icons'
import type { EvChargerProps, ParkingProps } from '../providers/mobilitat'
import { ALV_PARKING_URL, mergeParkings, normalizeAlvParking, occupancyLevel } from '../providers/parking'
import { groundBillboard, groundLabel } from './common'
import { syncEntities } from './sync'

const LEVEL_COLOR = { free: '#22c55e', busy: '#f59e0b', full: '#ef4444', unknown: PALETTE.parking } as const

function parkingLabel(p: ParkingProps, name: string) {
  return p.live && p.free !== undefined ? `${name} · ${p.free} lliures` : name
}

export class ParkingLayer extends Layer {
  constructor() {
    super({
      id: 'parking',
      title: 'Aparcaments',
      group: 'mobility',
      sources: ['alv-parking', 'mobilitat-points'],
      defaultEnabled: true,
      refreshMs: 2 * 60_000,
      description: 'Places lliures (Andorra la Vella) i capacitat (resta)',
    })
  }

  protected async load(): Promise<FeedResponse> {
    const fetchedAt = new Date().toISOString()
    const [alv, mob] = await Promise.allSettled([
      fetchJsonDirect<FeatureCollection>(ALV_PARKING_URL, { timeoutMs: 10_000 }),
      fetchFeed('mobility-points'),
    ])
    if (alv.status === 'rejected' && mob.status === 'rejected') throw alv.reason
    const alvEntities = alv.status === 'fulfilled' ? normalizeAlvParking(alv.value) : []
    const mobEntities = mob.status === 'fulfilled' ? (mob.value.entities.filter((e) => e.type === 'parking') as GeoEntity<ParkingProps>[]) : []
    const warnings = [
      alv.status === 'rejected' ? 'Ocupació d’Andorra la Vella no disponible' : '',
      mob.status === 'rejected' ? 'Llistat de Mobilitat no disponible' : '',
      mob.status === 'fulfilled' && mob.value.stale ? 'Llistat de Mobilitat: còpia en memòria cau' : '',
    ].filter(Boolean)
    return {
      source: alv.status === 'fulfilled' ? 'alv-parking' : 'mobilitat-points',
      fetchedAt,
      // The ALV service publishes no update time: sourceUpdatedAt stays undefined on purpose.
      entities: mergeParkings(alvEntities, mobEntities),
      warning: warnings.join(' · ') || undefined,
    }
  }

  protected render(items: GeoEntity[]) {
    syncEntities(
      this.dataSource,
      items as GeoEntity<ParkingProps>[],
      (e) => ({
        position: Cartesian3.fromDegrees(e.position.longitude, e.position.latitude),
        billboard: groundBillboard(badgeIcon('parking', LEVEL_COLOR[occupancyLevel(e.properties)], { size: 26 }), { scale: 0.75, maxDistance: 30_000 }),
        label: groundLabel(parkingLabel(e.properties, e.label), { maxDistance: 1_400 }),
      }),
      (entity, e) => {
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(e.position.longitude, e.position.latitude))
        entity.billboard!.image = new ConstantProperty(badgeIcon('parking', LEVEL_COLOR[occupancyLevel(e.properties)], { size: 26 }))
        entity.label!.text = new ConstantProperty(parkingLabel(e.properties, e.label))
      },
    )
  }

  describe(e: GeoEntity): EntityDetails {
    const p = (e as GeoEntity<ParkingProps>).properties
    const level = occupancyLevel(p)
    const fields: EntityDetails['fields'] = []
    if (p.live) {
      fields.push(
        { label: 'Places lliures', value: fmt.num(p.free), tone: level === 'full' ? 'bad' : level === 'busy' ? 'warn' : 'good' },
        { label: 'Places comptades', value: fmt.num(p.total) },
        { label: 'Ocupació', value: fmt.num(p.occupancyPct, 0, '%') },
      )
    } else {
      fields.push({ label: 'Capacitat', value: p.capacityText ?? fmt.num(p.capacity) })
    }
    if (p.pricePerHour !== undefined) fields.push({ label: 'Preu', value: fmt.num(p.pricePerHour, 2, '€/h') })
    if (p.operator) fields.push({ label: 'Titularitat', value: p.operator })
    return {
      title: e.label,
      subtitle: p.origin === 'alv-live' ? 'Aparcament comunal · Andorra la Vella' : 'Aparcament',
      badges: p.live ? ['COMPTADOR'] : ['CAPACITAT ESTÀTICA'],
      fields,
      note: p.live
        ? 'Places lliures segons el comptador del comú. El servei no publica l’hora d’actualització.'
        : 'Capacitat publicada per Mobilitat. Sense dades d’ocupació en temps real.',
    }
  }

  searchText(e: GeoEntity) {
    return `${e.label} aparcament parking`
  }
}

export class EvChargersLayer extends Layer {
  constructor() {
    super({
      id: 'ev-chargers',
      title: 'Recàrrega elèctrica',
      group: 'mobility',
      sources: ['mobilitat-points'],
      refreshMs: 60 * 60_000,
      description: 'Punts de recàrrega publicats per Mobilitat (sense disponibilitat)',
    })
  }

  protected async load(): Promise<FeedResponse> {
    const data = await fetchFeed('mobility-points')
    return { ...data, entities: data.entities.filter((e) => e.type === 'evCharger') }
  }

  protected render(items: GeoEntity[]) {
    const icon = badgeIcon('bolt', PALETTE.ev, { size: 26 })
    syncEntities(this.dataSource, items, (e) => ({
      position: Cartesian3.fromDegrees(e.position.longitude, e.position.latitude),
      billboard: groundBillboard(icon, { scale: 0.75, maxDistance: 30_000 }),
    }))
  }

  describe(e: GeoEntity): EntityDetails {
    const p = (e as GeoEntity<EvChargerProps>).properties
    return {
      title: e.label,
      subtitle: 'Punt de recàrrega de vehicles elèctrics',
      fields: [
        { label: 'Punts de càrrega', value: fmt.num(p.points) },
        { label: 'Adreça', value: p.address },
      ],
      note: 'No hi ha cap font pública de disponibilitat en temps real.',
    }
  }

  searchText(e: GeoEntity) {
    return `${e.label} recàrrega elèctric carregador EV`
  }
}
