import { Cartesian3, ClassificationType, Color, PolygonHierarchy } from 'cesium'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { fetchJsonDirect } from '../core/api'
import type { EntityDetails } from '../core/details'
import { Layer } from '../core/layer'
import type { FeedResponse, GeoEntity } from '../core/types'
import { andorraDate, DANGER_LEVELS, eawsRatingsUrl, normalizeEaws, type AvalancheProps, type EawsRatings } from '../providers/avalanche'

export const OFF_SEASON_WARNING = 'Fora de temporada: no hi ha butlletí d’allaus publicat avui'

export class AvalancheLayer extends Layer {
  private regions?: FeatureCollection<Polygon | MultiPolygon>

  constructor() {
    super({
      id: 'avalanche',
      title: 'Perill d’allaus',
      group: 'weather',
      sources: ['eaws'],
      defaultEnabled: false,
      refreshMs: 30 * 60_000,
      description: 'Nivell de perill EAWS per zona (temporada d’hivern)',
    })
  }

  /** Direct browser calls (CORS `*`). Regions are a static snapshot in public/data. */
  protected async load(): Promise<FeedResponse> {
    this.regions ??= await fetchJsonDirect<FeatureCollection<Polygon | MultiPolygon>>(`${import.meta.env.BASE_URL}data/eaws-ad-regions.geojson`)
    const date = andorraDate()
    let ratings: EawsRatings | undefined
    try {
      ratings = await fetchJsonDirect<EawsRatings>(eawsRatingsUrl(date), { timeoutMs: 12_000 })
    } catch (err) {
      // 404 = no bulletin file today (off-season); other errors propagate to the layer error state.
      if (!(err instanceof Error && /HTTP 404/.test(err.message))) throw err
    }
    const entities = normalizeEaws(ratings, this.regions, date)
    return {
      source: 'eaws',
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt: entities.length ? `${date}T00:00:00Z` : undefined,
      entities,
      warning: entities.length ? undefined : OFF_SEASON_WARNING,
    }
  }

  protected render(items: GeoEntity[]) {
    this.dataSource.entities.removeAll()
    for (const z of items as GeoEntity<AvalancheProps>[]) {
      const geom = z.geometry as Polygon | MultiPolygon
      const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
      const color = Color.fromCssColorString(DANGER_LEVELS[z.properties.level].color)
      polys.forEach((rings, i) =>
        this.dataSource.entities.add({
          id: `${z.id}#${i}`,
          polygon: {
            hierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArray(rings[0].flatMap((c) => [c[0], c[1]]))),
            material: color.withAlpha(0.35),
            classificationType: ClassificationType.TERRAIN,
          },
          properties: { geoId: z.id },
        }),
      )
    }
  }

  describe(e: GeoEntity): EntityDetails {
    const p = (e as GeoEntity<AvalancheProps>).properties
    const lvl = (n?: number) => (n ? `${n} – ${DANGER_LEVELS[n].name}` : '—')
    return {
      title: `Perill ${lvl(p.level)}`,
      subtitle: `${p.regionName} (${p.regionId})`,
      fields: [
        { label: 'Data del butlletí', value: p.date },
        { label: 'Matí / tarda', value: `${lvl(p.am)} / ${lvl(p.pm)}` },
        { label: 'Cota alta / baixa', value: `${lvl(p.high)} / ${lvl(p.low)}` },
      ],
      links: [
        { label: 'Butlletí SMN (meteo.ad)', url: 'https://www.meteo.ad/estatneu' },
        { label: 'avalanches.org', url: 'https://www.avalanches.org' },
      ],
      note: 'Nivell màxim del dia segons l’escala europea EAWS. Consulteu sempre el butlletí complet abans de sortir a muntanya.',
    }
  }

  searchText(e: GeoEntity) {
    return `${e.label} allaus neu avalanche`
  }
}
