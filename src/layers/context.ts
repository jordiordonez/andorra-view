import {
  Cartesian2,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  DistanceDisplayCondition,
  HeightReference,
  HorizontalOrigin,
  LabelStyle,
  NearFarScalar,
  PolylineGlowMaterialProperty,
  VerticalOrigin,
} from 'cesium'
import type { Feature, FeatureCollection, Geometry, LineString, MultiLineString, Position as GeoPosition } from 'geojson'
import { fetchJsonDirect } from '../core/api'
import { fmt, type EntityDetails } from '../core/details'
import { Layer, type LayerDefinition } from '../core/layer'
import type { EntityType, FeedResponse, GeoEntity } from '../core/types'
import { badgeIcon, PALETTE, type GlyphName } from '../map/icons'
import { groundBillboard, groundLabel } from './common'

/** Static reference layers loaded from the build-time snapshot in public/data (scripts/fetch-static.mjs). */

type Snapshot = FeatureCollection & { metadata?: { generatedAt?: string; source?: string } }

const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`

function representativePoint(g: Geometry): [number, number] {
  const coords: GeoPosition[] = []
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') coords.push(c as GeoPosition)
    else if (Array.isArray(c)) c.forEach(walk)
  }
  if ('coordinates' in g) walk(g.coordinates)
  if (!coords.length) return [0, 0]
  const lon = coords.reduce((s, c) => s + c[0], 0) / coords.length
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
  return [lon, lat]
}

/** Adapter: snapshot GeoJSON → normalized entities. Exported for tests. */
export function featuresToEntities(fc: Snapshot, type: EntityType, source: string, idPrefix: string, labelOf: (f: Feature) => string): GeoEntity[] {
  // Some upstream features have null geometry; skip them rather than fail the whole layer.
  return fc.features.flatMap((f, i) => {
    if (!f.geometry) return []
    const [lon, lat] = f.geometry.type === 'Point' ? (f.geometry.coordinates as [number, number]) : representativePoint(f.geometry)
    return {
      id: `${idPrefix}:${i}`,
      type,
      label: labelOf(f),
      position: { longitude: lon, latitude: lat },
      geometry: f.geometry,
      source,
      properties: { ...(f.properties ?? {}) },
    }
  })
}

function lineParts(g: Geometry): GeoPosition[][] {
  if (g.type === 'LineString') return [(g as LineString).coordinates]
  if (g.type === 'MultiLineString') return (g as MultiLineString).coordinates
  if (g.type === 'Polygon') return g.coordinates
  if (g.type === 'MultiPolygon') return g.coordinates.flat()
  return []
}

const toPositions = (line: GeoPosition[]) => Cartesian3.fromDegreesArray(line.flatMap((c) => [c[0], c[1]]))

abstract class SnapshotLayer extends Layer {
  constructor(
    def: LayerDefinition,
    private files: string[],
  ) {
    super({ refreshMs: 0, ...def })
  }

  protected abstract toEntities(snapshots: Snapshot[]): GeoEntity[]

  protected async load(): Promise<FeedResponse> {
    const snapshots = await Promise.all(this.files.map((f) => fetchJsonDirect<Snapshot>(dataUrl(f))))
    const generatedAt = snapshots.map((s) => s.metadata?.generatedAt).filter(Boolean).sort()[0]
    return { source: this.def.sources[0], fetchedAt: generatedAt ?? new Date().toISOString(), entities: this.toEntities(snapshots) }
  }

  protected rendered = false

  protected render(items: GeoEntity[]) {
    if (this.rendered) return
    this.rendered = true
    this.draw(items)
  }

  protected abstract draw(items: GeoEntity[]): void
}

export class BoundariesLayer extends SnapshotLayer {
  constructor() {
    super(
      { id: 'boundaries', title: 'Frontera i parròquies', group: 'context', sources: ['govern-sig'], defaultEnabled: true, description: 'Límits parroquials (no oficials) i frontera' },
      ['border.geojson', 'parishes.geojson'],
    )
  }

  protected toEntities([border, parishes]: Snapshot[]) {
    return [
      ...featuresToEntities(border, 'boundary', 'govern-sig', 'border', () => 'Frontera d’Andorra'),
      ...featuresToEntities(parishes, 'boundary', 'govern-sig', 'parish', (f) => String(f.properties?.name ?? 'Parròquia')),
    ]
  }

  protected draw(items: GeoEntity[]) {
    for (const e of items) {
      const isBorder = e.id.startsWith('border')
      lineParts(e.geometry!).forEach((line, i) =>
        this.dataSource.entities.add({
          id: `${e.id}#${i}`,
          polyline: {
            positions: toPositions(line),
            clampToGround: true,
            width: isBorder ? 4 : 1.6,
            material: isBorder
              ? new PolylineGlowMaterialProperty({ color: Color.fromCssColorString(PALETTE.accent), glowPower: 0.25 })
              : new ColorMaterialProperty(Color.fromCssColorString('#e2e8f0').withAlpha(0.55)),
          },
          properties: { geoId: e.id },
        }),
      )
      if (!isBorder) {
        this.dataSource.entities.add({
          id: `${e.id}#label`,
          position: Cartesian3.fromDegrees(e.position.longitude, e.position.latitude),
          label: {
            text: e.label.toUpperCase(),
            font: '600 13px Inter, system-ui, sans-serif',
            fillColor: Color.fromCssColorString('#e2e8f0').withAlpha(0.8),
            outlineColor: Color.fromCssColorString('#05070a'),
            outlineWidth: 3,
            style: LabelStyle.FILL_AND_OUTLINE,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new DistanceDisplayCondition(9_000, 90_000),
            scaleByDistance: new NearFarScalar(10_000, 1, 90_000, 0.7),
          },
          properties: { geoId: e.id },
        })
      }
    }
  }

  describe(e: GeoEntity): EntityDetails {
    if (e.id.startsWith('border')) return { title: 'Frontera d’Andorra', fields: [], note: 'Línia de frontera publicada pel Govern d’Andorra.' }
    return {
      title: `Parròquia ${e.label}`,
      fields: [
        { label: 'Abreviatura', value: fmt.text(e.properties.abbrev) },
        { label: 'Codi postal', value: fmt.text(e.properties.postalCode) },
      ],
      note: 'Límits parroquials marcats com a “no oficials” per la font.',
    }
  }
}

export class PlacesLayer extends SnapshotLayer {
  constructor() {
    super(
      { id: 'places', title: 'Nuclis i llocs', group: 'context', sources: ['osm'], defaultEnabled: true, description: 'Pobles, cims, hospitals, duanes (OSM)' },
      ['places.geojson', 'poi.geojson'],
    )
  }

  protected toEntities([places, poi]: Snapshot[]) {
    return [
      ...featuresToEntities(places, 'place', 'osm', 'place', (f) => String(f.properties?.name)),
      ...featuresToEntities(poi, 'infrastructure', 'osm', 'poi', (f) => String(f.properties?.name)),
    ]
  }

  protected draw(items: GeoEntity[]) {
    for (const e of items) {
      const p = e.properties as { place?: string; kind?: string; ele?: number }
      const position = Cartesian3.fromDegrees(e.position.longitude, e.position.latitude)
      if (e.type === 'place') {
        const town = p.place === 'town' || p.place === 'city'
        this.dataSource.entities.add({
          id: e.id,
          position,
          point: { pixelSize: town ? 7 : 5, color: Color.WHITE, outlineColor: Color.fromCssColorString('#05070a'), outlineWidth: 2, heightReference: HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: new DistanceDisplayCondition(0, town ? 80_000 : 20_000) },
          label: {
            text: e.label,
            font: town ? '700 15px Inter, system-ui, sans-serif' : '500 12px Inter, system-ui, sans-serif',
            fillColor: Color.WHITE,
            outlineColor: Color.fromCssColorString('#05070a'),
            outlineWidth: 4,
            style: LabelStyle.FILL_AND_OUTLINE,
            horizontalOrigin: HorizontalOrigin.LEFT,
            verticalOrigin: VerticalOrigin.CENTER,
            pixelOffset: new Cartesian2(9, 0),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new DistanceDisplayCondition(0, town ? 80_000 : 15_000),
          },
        })
        continue
      }
      const glyph: GlyphName = p.kind === 'hospital' ? 'hospital' : p.kind === 'peak' ? 'peak' : p.kind === 'ski' || p.kind === 'lift' ? 'ski' : p.kind === 'border' ? 'warning' : 'dot'
      const color = p.kind === 'hospital' ? PALETTE.hospital : p.kind === 'peak' ? '#cbd5e1' : PALETTE.accent
      const near = p.kind === 'peak' ? 9_000 : 25_000
      this.dataSource.entities.add({
        id: e.id,
        position,
        billboard: { ...groundBillboard(badgeIcon(glyph, color, { size: 26 }), { scale: 0.75, maxDistance: near }) },
        label: groundLabel(p.kind === 'peak' && p.ele ? `${e.label} ${p.ele} m` : e.label, { maxDistance: Math.min(near, 2_500) }),
      })
    }
  }

  describe(e: GeoEntity): EntityDetails {
    const p = e.properties as { place?: string; kind?: string; ele?: number; population?: number }
    const kinds: Record<string, string> = { hospital: 'Centre sanitari', peak: 'Cim', ski: 'Estació d’esquí', lift: 'Remuntador', border: 'Duana / frontera', town: 'Població', village: 'Poble', city: 'Ciutat' }
    return {
      title: e.label,
      subtitle: kinds[p.kind ?? p.place ?? ''] ?? 'Lloc',
      fields: [
        ...(p.ele ? [{ label: 'Altitud', value: fmt.num(p.ele, 0, 'm') }] : []),
        ...(p.population ? [{ label: 'Població (OSM)', value: fmt.num(p.population) }] : []),
      ],
    }
  }

  searchText(e: GeoEntity) {
    const p = e.properties as { kind?: string; place?: string }
    return `${e.label} ${p.kind ?? p.place ?? ''}`
  }
}

export class RoadsLayer extends SnapshotLayer {
  constructor() {
    super(
      { id: 'roads', title: 'Carreteres', group: 'mobility', sources: ['govern-sig'], defaultEnabled: true, description: 'Xarxa de carreteres generals i secundàries' },
      ['roads.geojson'],
    )
  }

  protected toEntities([roads]: Snapshot[]) {
    return featuresToEntities(roads, 'road', 'govern-sig', 'road', (f) => [f.properties?.ref, f.properties?.name].filter(Boolean).join(' · ') || 'Carretera')
  }

  protected draw(items: GeoEntity[]) {
    for (const e of items) {
      const ref = String(e.properties.ref ?? '')
      const general = /^CG/i.test(ref)
      lineParts(e.geometry!).forEach((line, i) =>
        this.dataSource.entities.add({
          id: `${e.id}#${i}`,
          polyline: {
            positions: toPositions(line),
            clampToGround: true,
            width: general ? 3 : 1.5,
            material: Color.fromCssColorString(general ? '#fde68a' : '#cbd5e1').withAlpha(general ? 0.85 : 0.5),
          },
          properties: { geoId: e.id },
        }),
      )
    }
  }

  describe(e: GeoEntity): EntityDetails {
    return { title: e.label, subtitle: 'Carretera', fields: [{ label: 'Tipus', value: fmt.text(e.properties.kind) }] }
  }

  searchText(e: GeoEntity) {
    return `${e.label} ${e.properties.ref ?? ''}`
  }
}

const BUS_COLORS: Record<string, string> = { L1: '#ef4444', L2: '#f97316', L3: '#eab308', L4: '#22c55e', L5: '#06b6d4', L6: '#3b82f6', L7: '#a855f7', LE: '#ec4899' }

export class BusLayer extends SnapshotLayer {
  constructor() {
    super(
      { id: 'buses', title: 'Bus nacional', group: 'mobility', sources: ['govern-sig'], description: 'Línies i parades 2025 (sense posició en temps real)' },
      ['bus-lines.geojson', 'bus-stops.geojson'],
    )
  }

  protected toEntities([lines, stops]: Snapshot[]) {
    return [
      ...featuresToEntities(lines, 'busLine', 'govern-sig', 'busline', (f) => `Línia ${String(f.properties?.line ?? '').toUpperCase()}`),
      ...featuresToEntities(stops, 'busStop', 'govern-sig', 'busstop', (f) => String(f.properties?.name ?? 'Parada')),
    ]
  }

  protected draw(items: GeoEntity[]) {
    for (const e of items) {
      const line = String(e.properties.line ?? '').toUpperCase()
      const color = BUS_COLORS[line] ?? PALETTE.bus
      if (e.type === 'busLine') {
        lineParts(e.geometry!).forEach((part, i) =>
          this.dataSource.entities.add({
            id: `${e.id}#${i}`,
            polyline: { positions: toPositions(part), clampToGround: true, width: 3, material: Color.fromCssColorString(color).withAlpha(0.9) },
            properties: { geoId: e.id },
          }),
        )
      } else {
        this.dataSource.entities.add({
          id: e.id,
          position: Cartesian3.fromDegrees(e.position.longitude, e.position.latitude),
          billboard: groundBillboard(badgeIcon('bus', color, { size: 24 }), { scale: 0.7, maxDistance: 9_000 }),
          label: groundLabel(e.label, { maxDistance: 1_200 }),
        })
      }
    }
  }

  describe(e: GeoEntity): EntityDetails {
    if (e.type === 'busLine') return { title: e.label, subtitle: 'Recorregut 2025', fields: [], badges: ['ESTÀTIC'], note: 'No hi ha cap font pública de posicions de bus en temps real (ni GTFS-RT).' }
    return {
      title: e.label,
      subtitle: `Parada · línia ${String(e.properties.line ?? '').toUpperCase()}`,
      fields: [{ label: 'Codi parada', value: fmt.text(e.properties.code) }],
      links: [{ label: 'Horaris (bus.ad)', url: 'https://bus.ad' }],
      note: 'Parades i recorreguts estàtics. Sense posicions de vehicles en temps real.',
    }
  }

  searchText(e: GeoEntity) {
    return `${e.label} bus ${e.properties.line ?? ''} ${e.properties.code ?? ''}`
  }
}
