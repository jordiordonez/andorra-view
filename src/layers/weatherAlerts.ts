import { ClassificationType, Color, PolygonHierarchy, Cartesian3 } from 'cesium'
import type { MultiPolygon, Polygon } from 'geojson'
import { fetchFeed } from '../core/api'
import type { EntityDetails } from '../core/details'
import { Layer } from '../core/layer'
import { formatLocalTime } from '../core/time'
import type { GeoEntity } from '../core/types'
import type { Severity, WeatherAlertProps } from '../providers/weatherAlerts'

export const SEVERITY_COLORS: Record<Severity, string> = {
  Minor: '#facc15',
  Moderate: '#f97316',
  Severe: '#ef4444',
  Extreme: '#a855f7',
  Unknown: '#94a3b8',
}

const SEVERITY_CA: Record<Severity, string> = { Minor: 'Lleu (groc)', Moderate: 'Moderat (taronja)', Severe: 'Sever (vermell)', Extreme: 'Extrem', Unknown: 'Desconegut' }

/** Meteoalarm awareness colour takes precedence over CAP severity when present. */
function colorFor(p: WeatherAlertProps): string {
  const byLevel: Record<string, string> = { yellow: '#facc15', orange: '#f97316', red: '#ef4444' }
  return (p.awarenessLevel && byLevel[p.awarenessLevel]) || SEVERITY_COLORS[p.severity]
}

export class WeatherAlertsLayer extends Layer {
  constructor() {
    super({
      id: 'weather-alerts',
      title: 'Avisos meteorològics',
      group: 'weather',
      sources: ['meteoalarm'],
      defaultEnabled: true,
      refreshMs: 5 * 60_000,
      description: 'Avisos oficials del SMN via Meteoalarm (zones nord, centre, sud)',
    })
  }

  protected load() {
    return fetchFeed('weather-alerts')
  }

  protected render(items: GeoEntity[]) {
    this.dataSource.entities.removeAll()
    for (const a of items as GeoEntity<WeatherAlertProps>[]) {
      const color = Color.fromCssColorString(colorFor(a.properties))
      const geom = a.geometry as Polygon | MultiPolygon | undefined
      const polys = geom?.type === 'Polygon' ? [geom.coordinates] : geom?.type === 'MultiPolygon' ? geom.coordinates : []
      polys.forEach((rings, i) =>
        this.dataSource.entities.add({
          id: `${a.id}#${i}`,
          polygon: {
            hierarchy: new PolygonHierarchy(
              Cartesian3.fromDegreesArray(rings[0].flatMap((c) => [c[0], c[1]])),
              rings.slice(1).map((h) => new PolygonHierarchy(Cartesian3.fromDegreesArray(h.flatMap((c) => [c[0], c[1]])))),
            ),
            material: color.withAlpha(a.properties.status === 'active' ? 0.28 : 0.14),
            classificationType: ClassificationType.TERRAIN,
          },
          properties: { geoId: a.id },
        }),
      )
      // Alerts without a polygon are still listed (and searchable) but not drawn as an area.
    }
  }

  describe(e: GeoEntity): EntityDetails {
    const p = (e as GeoEntity<WeatherAlertProps>).properties
    return {
      title: p.headline ?? p.event,
      subtitle: p.areaDesc,
      badges: [p.status === 'active' ? 'ACTIU' : 'PROPER'],
      fields: [
        { label: 'Nivell', value: SEVERITY_CA[p.severity], tone: p.severity === 'Minor' ? 'warn' : 'bad' },
        { label: 'Fenomen', value: p.awarenessType ?? p.event },
        { label: 'Inici', value: formatLocalTime(p.onset) },
        { label: 'Fi', value: formatLocalTime(p.expires) },
        { label: 'Certesa', value: p.certainty ?? '—' },
        ...(p.description ? [{ label: 'Descripció', value: p.description }] : []),
        ...(p.instruction ? [{ label: 'Recomanacions', value: p.instruction }] : []),
      ],
      links: p.web ? [{ label: 'meteo.ad', url: p.web }] : undefined,
      note: e.geometry ? undefined : 'L’avís no inclou cap polígon: s’aplica a la zona indicada.',
    }
  }

  searchText(e: GeoEntity) {
    const p = (e as GeoEntity<WeatherAlertProps>).properties
    return `${e.label} avís alerta ${p.awarenessType ?? ''}`
  }
}
